import {
  ApiError,
  EmbedContentResponse,
  FunctionCallingConfigMode,
  GenerateContentConfig,
  GenerateContentResponse,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  Schema,
  ThinkingLevel,
} from "@google/genai";
import { ZodObject } from "zod";
import {
  generateAssistantMessage,
  LlmCoreProvider,
  LlmError,
  LlmErrorType,
  LlmGenerationConfig,
  LlmMessage,
  LlmResponse,
  LlmStreamProviderResponseChunkEvent,
  LlmStreamResponseEvent,
  LlmToolCall,
} from "..";
import {
  generateRandomId,
  generateUniqueId,
  JorElAbortError,
  JorElLlmError,
  MaybeUndefined,
  zodSchemaToJsonSchema,
} from "../../shared";
import { convertLlmMessagesToGoogleGenerativeAiMessages } from "./convert-llm-message";

export interface GoogleGenerativeAIConfig {
  apiKey?: string;
  safetySettings?: {
    category: HarmCategory;
    threshold: HarmBlockThreshold;
  }[];
  name?: string;
}

export class GoogleGenerativeAIProvider implements LlmCoreProvider {
  public readonly name: string;
  static readonly defaultName = "google-generative-ai";

  readonly client: GoogleGenAI;

  private readonly safetySettings?: {
    category: HarmCategory;
    threshold: HarmBlockThreshold;
  }[];

  constructor(options: GoogleGenerativeAIConfig = {}) {
    this.name = options.name || GoogleGenerativeAIProvider.defaultName;
    const apiKey = options.apiKey || process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "[GoogleGenerativeAIProvider] Missing API key. Either pass it as config.apiKey or set the GOOGLE_AI_API_KEY environment variable",
      );
    }

    this.client = new GoogleGenAI({ apiKey });
    this.safetySettings = options.safetySettings;
  }

  async generateResponse(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): Promise<LlmResponse> {
    const start = Date.now();

    try {
      const { contents, systemInstruction } = convertLlmMessagesToGoogleGenerativeAiMessages(messages);

      const requestConfig = this.prepareGenerationConfig(config);

      // Add system instruction to config if present
      if (systemInstruction) {
        requestConfig.systemInstruction = systemInstruction;
      }

      // Add abort signal to config if present
      if (config.abortSignal) {
        requestConfig.abortSignal = config.abortSignal;
      }

      let result: GenerateContentResponse;

      try {
        result = await this.client.models.generateContent({
          model,
          contents,
          config: requestConfig,
        });
      } catch (error: unknown) {
        if (error instanceof Error && error.message.toLowerCase().includes("aborted")) {
          throw new JorElAbortError("Request was aborted");
        }

        const { message, type } = this.parseGoogleApiError(error);
        throw new JorElLlmError(`[GoogleGenerativeAIProvider] Error generating content: ${message}`, type);
      }

      const candidate = result.candidates?.[0];
      const contentParts = candidate?.content?.parts || [];

      const textParts = contentParts.filter((p) => p.text && !p.thought);
      const content = textParts.map((p) => p.text).join("");

      const reasoningParts = contentParts.filter((p) => p.thought);
      const reasoningContent = reasoningParts.length > 0 ? reasoningParts.map((p) => p.text).join("") : null;

      const toolCalls: MaybeUndefined<LlmToolCall[]> = [];

      for (const part of contentParts) {
        if (part.functionCall) {
          toolCalls.push({
            id: generateUniqueId(),
            request: {
              id: generateRandomId(),
              function: {
                name: part.functionCall.name ?? "",
                arguments: part.functionCall.args ?? {},
              },
              providerMetadata: part.thoughtSignature
                ? { google: { thoughtSignature: part.thoughtSignature } }
                : undefined,
            },
            approvalState: config.tools?.getTool(part.functionCall.name ?? "")?.requiresConfirmation
              ? "requiresApproval"
              : "noApprovalRequired",
            executionState: "pending",
            result: null,
            error: null,
          });
        }
      }

      const durationMs = Date.now() - start;

      return {
        ...generateAssistantMessage(content, reasoningContent, toolCalls.length > 0 ? toolCalls : undefined),
        meta: {
          model,
          provider: this.name,
          temperature: config.temperature ?? undefined,
          durationMs,
          inputTokens: undefined,
          outputTokens: undefined,
        },
      };
    } catch (error: unknown) {
      if (error instanceof JorElAbortError) {
        throw error;
      }
      throw error;
    }
  }

  async *generateResponseStream(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): AsyncGenerator<LlmStreamProviderResponseChunkEvent | LlmStreamResponseEvent, void, unknown> {
    const start = Date.now();

    const { contents, systemInstruction } = convertLlmMessagesToGoogleGenerativeAiMessages(messages);
    const requestConfig = this.prepareGenerationConfig(config);

    // Add system instruction to config if present
    if (systemInstruction) {
      requestConfig.systemInstruction = systemInstruction;
    }

    // Add abort signal to config if present
    if (config.abortSignal) {
      requestConfig.abortSignal = config.abortSignal;
    }

    let streamResult: AsyncGenerator<GenerateContentResponse, void, unknown>;

    try {
      streamResult = await this.client.models.generateContentStream({
        model,
        contents,
        config: requestConfig,
      });
    } catch (error: unknown) {
      const isAbort =
        error instanceof Error && (error.message.toLowerCase().includes("aborted") || error.name === "AbortError");

      const stopReason = isAbort ? "userCancelled" : "generationError";

      const { message: errorMessage, type: errorType } =
        stopReason === "generationError"
          ? this.parseGoogleApiError(error)
          : { message: "", type: "unknown" as LlmErrorType };

      yield {
        type: "response",
        role: "assistant",
        content: "",
        reasoningContent: null,
        meta: {
          model,
          provider: this.name,
          temperature: config.temperature ?? undefined,
          durationMs: 0,
          inputTokens: undefined,
          outputTokens: undefined,
        },
        stopReason,
        error:
          stopReason === "generationError"
            ? {
                message: errorMessage,
                type: errorType,
              }
            : undefined,
      };
      return;
    }

    let fullContent = "";
    let fullReasoningContent = "";
    const toolCalls: LlmToolCall[] = [];

    let error: LlmError | undefined;

    try {
      for await (const chunk of streamResult) {
        const candidate = chunk.candidates?.[0];
        const parts = candidate?.content?.parts || [];

        const textParts = parts.filter((p) => p.text && !p.thought);
        const chunkText = textParts.map((p) => p.text).join("");

        fullContent += chunkText;

        // Extract reasoning from parts
        const reasoningParts = parts.filter((p) => p.thought);
        const chunkReasoning = reasoningParts.map((p) => p.text).join("");
        fullReasoningContent += chunkReasoning;

        // Check for function calls
        for (const part of parts) {
          if (part.functionCall) {
            // Check if this function call is already in our toolCalls array
            const existingToolCall = toolCalls.find(
              (tc) =>
                tc.request.function.name === (part.functionCall!.name ?? "") &&
                JSON.stringify(tc.request.function.arguments) === JSON.stringify(part.functionCall!.args ?? {}),
            );

            if (!existingToolCall) {
              toolCalls.push({
                id: generateUniqueId(),
                request: {
                  id: generateRandomId(),
                  function: {
                    name: part.functionCall.name ?? "",
                    arguments: part.functionCall.args ?? {},
                  },
                  providerMetadata: part.thoughtSignature
                    ? { google: { thoughtSignature: part.thoughtSignature } }
                    : undefined,
                },
                approvalState: config.tools?.getTool(part.functionCall.name ?? "")?.requiresConfirmation
                  ? "requiresApproval"
                  : "noApprovalRequired",
                executionState: "pending",
                result: null,
                error: null,
              });
            }
          }
        }

        if (chunkText) {
          yield { type: "chunk", content: chunkText, chunkId: generateUniqueId() };
        }

        if (chunkReasoning) {
          yield { type: "reasoningChunk", content: chunkReasoning, chunkId: generateUniqueId() };
        }
      }
    } catch (e: unknown) {
      // Map Google GenAI SDK errors to our error types
      const { message: errorMessage, type } = this.parseGoogleApiError(e);

      error = {
        message: errorMessage,
        type,
      };
    }

    const durationMs = Date.now() - start;

    // Determine stop reason and error message
    const stopReason = config.abortSignal?.aborted ? "userCancelled" : error ? "generationError" : "completed";

    // Log non-abort errors
    if (error && stopReason === "generationError") {
      config.logger?.error("GoogleGenerativeAIProvider", `Stream error: ${error.message}`);
    }

    const meta = {
      model,
      provider: this.name,
      temperature: config.temperature ?? undefined,
      durationMs,
      inputTokens: undefined,
      outputTokens: undefined,
    };

    // If we have tool calls, yield a response with tools
    if (toolCalls.length > 0) {
      yield {
        type: "response",
        role: "assistant_with_tools",
        content: fullContent,
        reasoningContent: fullReasoningContent || null,
        toolCalls,
        meta,
        stopReason,
        error: stopReason === "generationError" ? error : undefined,
      };
    } else {
      yield {
        type: "response",
        role: "assistant",
        content: fullContent,
        reasoningContent: fullReasoningContent || null,
        meta,
        stopReason,
        error: stopReason === "generationError" ? error : undefined,
      };
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return [];
  }

  async createEmbedding(model: string, text: string, abortSignal?: AbortSignal): Promise<number[]> {
    let result: EmbedContentResponse;
    try {
      result = await this.client.models.embedContent({
        model,
        contents: [{ role: "user", parts: [{ text }] }],
        config: abortSignal ? { abortSignal } : undefined,
      });
    } catch (error: any) {
      if (error.name === "AbortError" || (error.message && error.message.toLowerCase().includes("aborted"))) {
        throw new JorElAbortError("Request was aborted");
      }
      throw error;
    }

    if (!result.embeddings || result.embeddings.length === 0) {
      throw new Error("No embedding returned");
    }

    return result.embeddings[0].values ?? [];
  }

  // Helper method for parsing Google API errors
  private parseGoogleApiError(error: unknown): { message: string; type: LlmErrorType } {
    let errorMessage: string;
    let errorType: LlmErrorType = "unknown";

    const status = error instanceof ApiError ? error.status : undefined;
    errorMessage = error instanceof Error ? error.message : String(error);

    // Try to parse the error message if it's a JSON string from Google API
    if (error instanceof ApiError && errorMessage.startsWith("{")) {
      try {
        const parsedError = JSON.parse(errorMessage);
        if (parsedError.error?.message) {
          // The error message itself might be a JSON string
          if (parsedError.error.message.startsWith("{")) {
            try {
              const innerError = JSON.parse(parsedError.error.message);
              errorMessage = innerError.error?.message || parsedError.error.message;
            } catch {
              errorMessage = parsedError.error.message;
            }
          } else {
            errorMessage = parsedError.error.message;
          }
        }
      } catch {
        // If parsing fails, use the original message
      }
    }

    // Map status codes to error types
    if (status === 400) {
      errorType = "invalid_request";
    } else if (status === 401) {
      errorType = "authentication_error";
    } else if (status === 403) {
      // 403 can mean quota exceeded or permission denied
      const lowerMessage = errorMessage.toLowerCase();
      if (lowerMessage.includes("quota") || lowerMessage.includes("resource exhausted")) {
        errorType = "quota_exceeded";
      } else {
        errorType = "authentication_error";
      }
    } else if (status === 404) {
      errorType = "invalid_request";
    } else if (status === 429) {
      errorType = "rate_limit";
    } else if (status && status >= 500) {
      errorType = "server_error";
    }

    return { message: errorMessage, type: errorType };
  }

  // Helper method for preparing request configuration
  private prepareGenerationConfig(config: LlmGenerationConfig): GenerateContentConfig {
    const requestConfig: GenerateContentConfig = {
      safetySettings: this.safetySettings,
    };

    if (config.reasoningEffort) {
      requestConfig.thinkingConfig = {
        includeThoughts: true,
        thinkingBudget: config.reasoningEffort === "minimal" ? 0 : undefined,
        thinkingLevel:
          config.reasoningEffort === "minimal"
            ? undefined
            : config.reasoningEffort === "high" || config.reasoningEffort === "medium"
              ? ThinkingLevel.HIGH
              : ThinkingLevel.LOW,
      };
    }

    // Add generation config
    if (config.temperature !== undefined || config.maxTokens !== undefined || config.json) {
      requestConfig.temperature = config.temperature ?? undefined;
      requestConfig.maxOutputTokens = config.maxTokens ?? undefined;

      if (config.json) {
        requestConfig.responseMimeType = "application/json";

        if (typeof config.json !== "boolean") {
          requestConfig.responseJsonSchema =
            config.json instanceof ZodObject ? zodSchemaToJsonSchema(config.json) : config.json;
        }
      }
    }

    // Add tools
    if (config.tools?.asLlmFunctions?.length) {
      requestConfig.tools = [
        {
          functionDeclarations: config.tools.asLlmFunctions.map((f) => ({
            name: f.function.name,
            description: f.function.description,
            parameters: f.function.parameters as unknown as Schema, // TODO: Improve types
          })),
        },
      ];
    }

    // Add tool config
    if (config.tools?.hasTools && config.toolChoice) {
      let mode: FunctionCallingConfigMode = FunctionCallingConfigMode.AUTO;
      if (config.toolChoice === "none") {
        mode = FunctionCallingConfigMode.NONE;
      } else if (config.toolChoice === "required") {
        mode = FunctionCallingConfigMode.ANY;
      }

      requestConfig.toolConfig = {
        functionCallingConfig: {
          mode,
        },
      };
    }

    return requestConfig;
  }
}
