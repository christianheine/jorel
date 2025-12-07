import {
  ClientError,
  Content,
  CountTokensResponse,
  GenerateContentResponse,
  GoogleApiError,
  HarmBlockThreshold,
  HarmCategory,
  StreamGenerateContentResult,
  Tool,
  VertexAI,
} from "@google-cloud/vertexai";
import { FunctionDeclaration, FunctionDeclarationSchema } from "@google-cloud/vertexai/src/types/content";
import { ToolCall } from "ollama";
import { ZodObject } from "zod";
import {
  generateAssistantMessage,
  LlmCoreProvider,
  LlmError,
  LlmGenerationConfig,
  LlmMessage,
  LlmResponse,
  LlmStreamProviderResponseChunkEvent,
  LlmStreamResponseEvent,
  LlmToolCall,
  toolChoiceToVertexAi,
} from "../../providers";
import {
  generateRandomId,
  generateUniqueId,
  JorElAbortError,
  MaybeUndefined,
  zodSchemaToJsonSchema,
} from "../../shared";
import { convertLlmMessagesToVertexAiMessages } from "./convert-llm-message";

const defaultSafetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_UNSPECIFIED,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

export { HarmBlockThreshold as VertexAiHarmBlockThreshold, HarmCategory as VertexAiHarmCategory };

export interface GoogleVertexAiConfig {
  project?: string;
  location?: string;
  keyFilename?: string;
  safetySettings?: { category: HarmCategory; threshold: HarmBlockThreshold }[];
  name?: string;
}

/** Provides access to GoogleVertexAi and other compatible services */
export class GoogleVertexAiProvider implements LlmCoreProvider {
  static readonly defaultName = "google-vertex-ai";

  public readonly name;
  readonly client: VertexAI;

  /** @internal */
  private readonly safetySettings: {
    category: HarmCategory;
    threshold: HarmBlockThreshold;
  }[] = defaultSafetySettings;

  constructor({ project, location, keyFilename, safetySettings, name }: GoogleVertexAiConfig = {}) {
    this.name = name || GoogleVertexAiProvider.defaultName;
    const config = {
      project: project || process.env.GCP_PROJECT,
      location: location || process.env.GCP_LOCATION,
      keyFilename: keyFilename || process.env.GOOGLE_APPLICATION_CREDENTIALS,
    };

    if (!config.project)
      throw new Error(
        "[GoogleVertexAiProvider] Missing GCP project. Either pass it as config.project or set the GCP_PROJECT environment variable",
      );
    if (!config.location)
      throw new Error(
        "[GoogleVertexAiProvider] Missing GCP location. Either pass it as config.location or set the GCP_LOCATION environment variable",
      );

    this.client = new VertexAI({
      googleAuthOptions: {
        projectId: config.project,
        keyFilename: config.keyFilename,
      },
      location: config.location,
      project: config.project,
    });

    if (safetySettings) {
      this.safetySettings = safetySettings;
    }
  }

  async generateResponse(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): Promise<LlmResponse> {
    const start = Date.now();

    const { chatMessages, systemMessage } = await convertLlmMessagesToVertexAiMessages(messages);

    const generativeModel = this.client.getGenerativeModel({
      model,
    });

    const temperature = config.temperature ?? undefined;
    const maxTokens = config.maxTokens ?? undefined;

    let response: GenerateContentResponse;

    try {
      // Note: Google Vertex AI SDK doesn't support AbortSignal directly
      // Check for cancellation before making the request
      if (config.abortSignal?.aborted) {
        throw new JorElAbortError("Request was aborted");
      }

      response = (
        await generativeModel.generateContent({
          contents: chatMessages,
          systemInstruction: systemMessage,
          tools: config.tools?.asLlmFunctions?.map<Tool>((f) => {
            const functionDeclarations: FunctionDeclaration[] = [
              {
                name: f.function.name,
                description: f.function.description,
                parameters: f.function.parameters as unknown as FunctionDeclarationSchema,
              },
            ];
            return { functionDeclarations };
          }),
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            responseMimeType: config.json ? "application/json" : "text/plain",
            responseSchema:
              config.json && typeof config.json !== "boolean"
                ? config.json instanceof ZodObject
                  ? zodSchemaToJsonSchema(config.json)
                  : (config.json as any)
                : undefined,
          },
          toolConfig: toolChoiceToVertexAi(config.tools?.hasTools ?? false, config.toolChoice),
          safetySettings: this.safetySettings,
        })
      ).response;
    } catch (error: unknown) {
      if (error instanceof JorElAbortError) {
        throw error;
      }
      if (error instanceof ClientError) {
        throw new Error(`[GoogleVertexAiProvider] Error generating content: ${error.message}`);
      }
      if (error instanceof GoogleApiError) {
        throw new Error(
          `[GoogleVertexAiProvider] Error generating content: ${error.message}, code: ${error.code}, status: ${error.status}, details: ${error.errorDetails}`,
        );
      }
      throw error;
    }

    const inputTokens = response.usageMetadata?.promptTokenCount;
    const outputTokens = response.usageMetadata?.candidatesTokenCount;

    const responseContent: Content =
      response.candidates && response.candidates.length > 0
        ? response.candidates[0].content
        : { role: "model", parts: [{ text: "" }] };

    const reasoningContent = null;

    const content = responseContent.parts
      .filter((p) => !!p.text)
      .map((p) => p.text)
      .join("")
      .trim();

    const toolCalls: MaybeUndefined<LlmToolCall[]> = responseContent.parts
      .filter((p) => p.functionCall)
      .map((p) => {
        const functionCall = p.functionCall!;
        return {
          id: generateUniqueId(),
          request: {
            id: generateRandomId(),
            function: {
              name: functionCall.name,
              arguments: functionCall.args,
            },
          },
          approvalState: "noApprovalRequired",
          executionState: "pending",
          result: null,
          error: null,
        };
      });

    const durationMs = Date.now() - start;

    const provider = this.name;

    return {
      ...generateAssistantMessage(content, reasoningContent, toolCalls),
      meta: {
        model,
        provider,
        temperature,
        durationMs,
        inputTokens,
        outputTokens,
      },
    };
  }

  async *generateResponseStream(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): AsyncGenerator<LlmStreamProviderResponseChunkEvent | LlmStreamResponseEvent, void, unknown> {
    const start = Date.now();

    const provider = this.name;

    const { chatMessages, systemMessage } = await convertLlmMessagesToVertexAiMessages(messages);

    const generativeModel = this.client.getGenerativeModel({
      model,
    });

    const temperature = config.temperature ?? undefined;
    const maxTokens = config.maxTokens ?? undefined;

    // Note: Google Vertex AI SDK doesn't support AbortSignal directly
    // Check for cancellation before making the request
    if (config.abortSignal?.aborted) {
      yield {
        type: "response",
        role: "assistant",
        content: "",
        reasoningContent: null,
        meta: {
          model,
          provider,
          temperature,
          durationMs: 0,
          inputTokens: undefined,
          outputTokens: undefined,
        },
        stopReason: "userCancelled",
      };
      return;
    }

    let response: StreamGenerateContentResult;

    try {
      response = await generativeModel.generateContentStream({
        contents: chatMessages,
        systemInstruction: systemMessage,
        tools: config.tools?.asLlmFunctions?.map<Tool>((f) => {
          const functionDeclarations: FunctionDeclaration[] = [
            {
              name: f.function.name,
              description: f.function.description,
              parameters: f.function.parameters as unknown as FunctionDeclarationSchema,
            },
          ];
          return { functionDeclarations };
        }),
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          responseMimeType: config.json ? "application/json" : "text/plain",
          responseSchema:
            config.json && typeof config.json !== "boolean"
              ? config.json instanceof ZodObject
                ? zodSchemaToJsonSchema(config.json)
                : (config.json as any)
              : undefined,
        },
        toolConfig: toolChoiceToVertexAi(config.tools?.hasTools ?? false, config.toolChoice),
        safetySettings: this.safetySettings,
      });
    } catch (error: unknown) {
      const isAbort =
        error instanceof Error &&
        (error.message.toLowerCase().includes("aborted") ||
          error.name === "AbortError" ||
          error instanceof JorElAbortError);

      const stopReason = isAbort ? "userCancelled" : "generationError";

      yield {
        type: "response",
        role: "assistant",
        content: "",
        reasoningContent: null,
        meta: {
          model,
          provider,
          temperature,
          durationMs: 0,
          inputTokens: undefined,
          outputTokens: undefined,
        },
        stopReason,
        error:
          stopReason === "generationError"
            ? {
                message: error instanceof Error ? error.message : String(error),
                type: "unknown",
              }
            : undefined,
      };
      return;
    }

    const _toolCalls: ToolCall[] = [];
    let streamedContent = "";

    let error: LlmError | undefined;
    let aborted = false;

    try {
      for await (const res of response.stream) {
        // Check for cancellation during streaming
        if (config.abortSignal?.aborted) {
          aborted = true;
          break;
        }

        const content: Content =
          res.candidates && res.candidates.length > 0
            ? res.candidates[0].content
            : { role: "model", parts: [{ text: "" }] };

        if (content && content.parts && content.parts.length > 0) {
          // Handle function calls in the stream
          const functionCalls = content.parts.filter((p) => p.functionCall);
          for (const part of functionCalls) {
            if (part.functionCall) {
              _toolCalls.push({
                function: {
                  name: part.functionCall.name,
                  arguments: part.functionCall.args,
                },
              });
            }
          }

          // Handle text content
          const textContent = content.parts.map((part) => ("text" in part ? part.text : "")).join("");
          if (textContent.length > 0) {
            streamedContent += textContent;
            const chunkId = generateUniqueId();
            yield { type: "chunk", content: textContent, chunkId };
          }
        }
      }
    } catch (e: unknown) {
      error = {
        message: e instanceof Error ? e.message : String(e),
        type: "unknown",
      };
    }

    const durationMs = Date.now() - start;

    // Determine stop reason and error message
    const stopReason = config.abortSignal?.aborted ? "userCancelled" : error ? "generationError" : "completed";

    // Log non-abort errors
    if (error && stopReason === "generationError") {
      config.logger?.error("GoogleVertexAiProvider", `Stream error: ${error.message}`);
    }

    // Try to get final response for token counts, but use streamed content as fallback
    let finalContent = streamedContent;
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;

    if (!error && !aborted && !config.abortSignal?.aborted) {
      try {
        const r = await response.response;
        const rawContent: Content =
          r.candidates && r.candidates.length > 0 ? r.candidates[0].content : { role: "model", parts: [{ text: "" }] };
        finalContent = rawContent.parts.map((p) => p.text).join("");
        inputTokens = r.usageMetadata?.promptTokenCount;
        outputTokens = r.usageMetadata?.candidatesTokenCount;
      } catch {
        // Use streamed content if final response fails
      }
    }

    const reasoningContent = null;

    const toolCalls: MaybeUndefined<LlmToolCall[]> = _toolCalls.map((call) => {
      return {
        id: generateUniqueId(),
        request: {
          id: generateRandomId(),
          function: {
            name: call.function.name,
            arguments: call.function.arguments,
          },
        },
        approvalState: config.tools?.getTool(call.function.name)?.requiresConfirmation
          ? "requiresApproval"
          : "noApprovalRequired",
        executionState: "pending",
        result: null,
        error: null,
      };
    });

    const meta = {
      model,
      provider,
      temperature,
      durationMs,
      inputTokens,
      outputTokens,
    };

    if (toolCalls.length > 0) {
      yield {
        type: "response",
        role: "assistant_with_tools",
        content: finalContent,
        reasoningContent,
        toolCalls,
        meta,
        stopReason,
        error: stopReason === "generationError" ? error : undefined,
      };
    } else {
      yield {
        type: "response",
        role: "assistant",
        content: finalContent,
        reasoningContent,
        meta,
        stopReason,
        error: stopReason === "generationError" ? error : undefined,
      };
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return [];
  }

  async countTokens(
    model: string,
    contents: Content[],
  ): Promise<{
    model: string;
    inputTokens: number;
    characterCount: number;
  }> {
    const generativeModel = this.client.getGenerativeModel({
      model: model,
      safetySettings: this.safetySettings,
    });

    const response: CountTokensResponse = await generativeModel.countTokens({
      contents,
    });

    const inputTokens = response.totalTokens;

    const characterCount = contents.reduce((acc, content) => {
      return acc + content.parts.reduce((acc, part) => acc + ("text" in part ? part?.text?.length || 0 : 0), 0);
    }, 0);

    return {
      model,
      inputTokens,
      characterCount,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createEmbedding(model: string, text: string, abortSignal?: AbortSignal): Promise<number[]> {
    throw new Error("Embeddings are not yet supported for Vertex AI");
  }
}
