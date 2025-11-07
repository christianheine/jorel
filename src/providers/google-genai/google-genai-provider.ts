import {
  EmbedContentResponse,
  FunctionCallingConfigMode,
  GenerateContentConfig,
  GenerateContentResponse,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  Schema,
} from "@google/genai";
import { ZodObject } from "zod";
import {
  generateAssistantMessage,
  initialGoogleGenAiModels,
  LlmCoreProvider,
  LlmGenerationConfig,
  LlmMessage,
  LlmResponse,
  LlmStreamResponse,
  LlmStreamResponseChunk,
  LlmStreamResponseWithToolCalls,
  LlmToolCall,
} from "..";
import {
  generateRandomId,
  generateUniqueId,
  JorElAbortError,
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
      } catch (error: any) {
        if (error.name === "AbortError" || (error.message && error.message.toLowerCase().includes("aborted"))) {
          throw new JorElAbortError("Request was aborted");
        }
        throw new Error(`[GoogleGenerativeAIProvider] Error generating content: ${error}`);
      }

      const content = result.text ?? "";
      const functionCalls = result.functionCalls ?? [];

      const toolCalls: MaybeUndefined<LlmToolCall[]> =
        functionCalls.length > 0
          ? functionCalls.map((functionCall) => ({
              id: generateUniqueId(),
              request: {
                id: generateRandomId(),
                function: {
                  name: functionCall.name ?? "",
                  arguments: functionCall.args ?? {},
                },
              },
              approvalState: config.tools?.getTool(functionCall.name ?? "")?.requiresConfirmation
                ? "requiresApproval"
                : "noApprovalRequired",
              executionState: "pending",
              result: null,
              error: null,
            }))
          : undefined;

      const durationMs = Date.now() - start;

      return {
        ...generateAssistantMessage(content, toolCalls),
        meta: {
          model,
          provider: this.name,
          temperature: config.temperature ?? undefined,
          durationMs,
          inputTokens: undefined,
          outputTokens: undefined,
        },
      };
    } catch (error: any) {
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
  ): AsyncGenerator<LlmStreamResponseChunk | LlmStreamResponse | LlmStreamResponseWithToolCalls> {
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

      let streamResult: AsyncGenerator<GenerateContentResponse, any, any>;

      try {
        streamResult = await this.client.models.generateContentStream({
          model,
          contents,
          config: requestConfig,
        });
      } catch (error: any) {
        if (error.name === "AbortError" || (error.message && error.message.toLowerCase().includes("aborted"))) {
          throw new JorElAbortError("Request was aborted");
        }
        throw new Error(`[GoogleGenerativeAIProvider] Error generating content stream: ${error}`);
      }

      let fullContent = "";
      const toolCalls: LlmToolCall[] = [];

      for await (const chunk of streamResult) {
        const chunkText = chunk.text ?? "";
        fullContent += chunkText;

        // Check for function calls in each chunk
        const functionCalls = chunk.functionCalls ?? [];

        if (functionCalls && functionCalls.length > 0) {
          // Process new function calls that haven't been seen before
          for (const functionCall of functionCalls) {
            // Check if this function call is already in our toolCalls array
            const existingToolCall = toolCalls.find(
              (tc) =>
                tc.request.function.name === (functionCall.name ?? "") &&
                JSON.stringify(tc.request.function.arguments) === JSON.stringify(functionCall.args ?? {}),
            );

            if (!existingToolCall) {
              const newToolCall: LlmToolCall = {
                id: generateUniqueId(),
                request: {
                  id: generateRandomId(),
                  function: {
                    name: functionCall.name ?? "",
                    arguments: functionCall.args ?? {},
                  },
                },
                approvalState: config.tools?.getTool(functionCall.name ?? "")?.requiresConfirmation
                  ? "requiresApproval"
                  : "noApprovalRequired",
                executionState: "pending",
                result: null,
                error: null,
              };

              toolCalls.push(newToolCall);
            }
          }
        }

        if (chunkText) {
          yield { type: "chunk", content: chunkText };
        }
      }

      const durationMs = Date.now() - start;
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
          toolCalls,
          meta,
        };
      } else {
        yield {
          type: "response",
          role: "assistant",
          content: fullContent,
          meta,
        };
      }
    } catch (error: any) {
      if (error instanceof JorElAbortError) {
        throw error;
      }
      throw error;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return initialGoogleGenAiModels;
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

  // Helper method for preparing request configuration
  private prepareGenerationConfig(config: LlmGenerationConfig): GenerateContentConfig {
    const requestConfig: GenerateContentConfig = {
      safetySettings: this.safetySettings,
    };

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
