import { Mistral } from "@mistralai/mistralai";
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
} from "../../providers";
import { firstEntry, generateUniqueId, JorElAbortError, JorElLlmError, MaybeUndefined } from "../../shared";
import { LlmToolKit } from "../../tools";
import { jsonResponseToMistral, toolChoiceToMistral } from "./convert-inputs";
import { convertLlmMessagesToMistralMessages } from "./convert-llm-message";

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface MistralConfig {
  apiKey?: string;
  retryConfig?: {
    strategy: "backoff";
    backoff?: {
      initialInterval: number;
      maxInterval: number;
      exponent: number;
      maxElapsedTime: number;
    };
    retryConnectionErrors?: boolean;
  };
  timeout?: number;
}

/** Provides access to OpenAI and other compatible services */
export class MistralProvider implements LlmCoreProvider {
  public readonly name;
  static readonly defaultName = "mistral";
  readonly client: Mistral;

  constructor({ apiKey, retryConfig, timeout }: MistralConfig = {}) {
    this.name = MistralProvider.defaultName;
    this.client = new Mistral({
      apiKey: apiKey ?? process.env.MISTRAL_API_KEY,
      retryConfig,
      timeoutMs: timeout,
    });
  }

  // Helper method for parsing Mistral API errors
  private parseMistralError(error: unknown): { message: string; type: LlmErrorType } {
    let errorMessage: string;
    let errorType: LlmErrorType = "unknown";

    // Extract error information from Mistral SDK errors
    if (error && typeof error === "object") {
      const err = error as any;

      // Mistral SDK errors have a specific format: "API error occurred: Status XXX\nBody: {...}"
      errorMessage = err.message || (error instanceof Error ? error.message : String(error));

      // Parse Mistral-specific error format
      const statusMatch = errorMessage.match(/API error occurred: Status (\d+)/);
      const bodyMatch = errorMessage.match(/Body: (\{.*\})$/);

      if (statusMatch && bodyMatch) {
        const statusCode = parseInt(statusMatch[1], 10);
        const jsonBody = bodyMatch[1];

        // Try to parse the JSON body
        try {
          const parsedError = JSON.parse(jsonBody);
          if (parsedError.message) {
            errorMessage = parsedError.message;
          }

          // Map status codes to error types
          if (statusCode === 400) {
            errorType = "invalid_request";
          } else if (statusCode === 401) {
            errorType = "authentication_error";
          } else if (statusCode === 403) {
            errorType = "authentication_error";
          } else if (statusCode === 404) {
            errorType = "invalid_request";
          } else if (statusCode === 429) {
            // 429 can mean either rate limit or quota exceeded
            const lowerMessage = errorMessage.toLowerCase();
            if (lowerMessage.includes("quota") || lowerMessage.includes("capacity")) {
              errorType = "quota_exceeded";
            } else {
              errorType = "rate_limit";
            }
          } else if (statusCode >= 500) {
            errorType = "server_error";
          }
        } catch {
          // If JSON parsing fails, use the status code to set error type
          if (statusCode === 400) {
            errorType = "invalid_request";
          } else if (statusCode === 401) {
            errorType = "authentication_error";
          } else if (statusCode === 403) {
            errorType = "authentication_error";
          } else if (statusCode === 404) {
            errorType = "invalid_request";
          } else if (statusCode === 429) {
            errorType = "rate_limit";
          } else if (statusCode >= 500) {
            errorType = "server_error";
          }
        }
      }

      // Handle network-related errors
      if (err.message) {
        const lowerMessage = err.message.toLowerCase();
        if (
          lowerMessage.includes("network") ||
          lowerMessage.includes("fetch failed") ||
          lowerMessage.includes("econnrefused")
        ) {
          errorType = "network_error";
        } else if (lowerMessage.includes("timeout")) {
          errorType = "timeout";
        }
      }
    } else {
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    return { message: errorMessage, type: errorType };
  }

  async generateResponse(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): Promise<LlmResponse> {
    const start = Date.now();

    const temperature = config.temperature ?? undefined;

    let response: Awaited<ReturnType<typeof this.client.chat.complete>>;

    try {
      response = await this.client.chat.complete(
        {
          model,
          messages: await convertLlmMessagesToMistralMessages(messages),
          temperature,
          responseFormat: jsonResponseToMistral(config.json),
          maxTokens: config.maxTokens,
          toolChoice: toolChoiceToMistral(config.toolChoice),
          tools: config.tools?.asLlmFunctions?.map((f) => ({
            type: "function",
            function: {
              name: f.function.name,
              description: f.function.description,
              parameters: {
                type: f.function.parameters?.type ?? "object",
                properties: f.function.parameters?.properties ?? ({} as Record<string, any>),
                required: f.function.parameters?.required ?? [],
              },
            },
          })),
        },
        config.abortSignal ? { fetchOptions: { signal: config.abortSignal } } : undefined,
      );
    } catch (error: any) {
      if (error.name === "AbortError" || (error.message && error.message.toLowerCase().includes("aborted"))) {
        throw new JorElAbortError("Request was aborted");
      }

      const { message, type } = this.parseMistralError(error);
      throw new JorElLlmError(`[MistralProvider] Error generating content: ${message}`, type);
    }

    const durationMs = Date.now() - start;

    const inputTokens: MaybeUndefined<number> = response.usage?.promptTokens;
    const outputTokens: MaybeUndefined<number> = response.usage?.completionTokens;

    const message = response.choices ? firstEntry(response.choices)?.message : undefined;

    const content = Array.isArray(message?.content)
      ? message.content.map((c) => (c.type === "text" ? c.text : "")).join("")
      : (message?.content ?? null);

    const reasoningContent = Array.isArray(message?.content)
      ? message.content.map((c) => (c.type === "thinking" ? c.thinking : "")).join("")
      : null;

    const toolCalls: MaybeUndefined<LlmToolCall[]> = message?.toolCalls?.map((call) => {
      return {
        id: generateUniqueId(),
        request: {
          id: call.id ?? generateUniqueId(),
          function: {
            name: call.function.name,
            arguments:
              typeof call.function.arguments == "string"
                ? LlmToolKit.deserialize(call.function.arguments)
                : call.function.arguments,
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

    const temperature = config.temperature ?? undefined;

    let response: Awaited<ReturnType<typeof this.client.chat.stream>>;

    try {
      response = await this.client.chat.stream(
        {
          model,
          messages: await convertLlmMessagesToMistralMessages(messages),
          temperature,
          responseFormat: jsonResponseToMistral(config.json),
          maxTokens: config.maxTokens,
          stream: true,
          tools: config.tools?.asLlmFunctions?.map((f) => ({
            type: "function",
            function: {
              name: f.function.name,
              description: f.function.description,
              parameters: {
                type: f.function.parameters?.type ?? "object",
                properties: f.function.parameters?.properties ?? ({} as Record<string, any>),
                required: f.function.parameters?.required ?? [],
              },
            },
          })),
          toolChoice: toolChoiceToMistral(config.toolChoice),
        },
        config.abortSignal ? { fetchOptions: { signal: config.abortSignal } } : undefined,
      );
    } catch (error: any) {
      const isAbort =
        error?.name === "AbortError" ||
        (error?.message && typeof error.message === "string" && error.message.toLowerCase().includes("aborted"));

      const stopReason = isAbort ? "userCancelled" : "generationError";

      yield {
        type: "response",
        role: "assistant",
        content: "",
        reasoningContent: "",
        meta: {
          model,
          provider: this.name,
          temperature,
          durationMs: 0,
          inputTokens: undefined,
          outputTokens: undefined,
        },
        stopReason,
        error: stopReason === "generationError" ? this.parseMistralError(error) : undefined,
      };
      return;
    }

    let inputTokens: MaybeUndefined<number>;
    let outputTokens: MaybeUndefined<number>;

    const _toolCalls: ToolCall[] = [];

    let content = "";
    let reasoningContent = "";

    let error: LlmError | undefined;

    const provider = this.name;

    try {
      for await (const chunk of response) {
        const delta = firstEntry(chunk.data.choices)?.delta;
        if (delta?.content) {
          const contentChunk = Array.isArray(delta.content)
            ? delta.content.map((c) => (c.type === "text" ? c.text : "")).join("")
            : delta.content;
          const reasoningChunk = Array.isArray(delta.content)
            ? delta.content.map((c) => (c.type === "thinking" ? c.thinking : "")).join("")
            : null;

          if (contentChunk) {
            content += contentChunk;
            const chunkId = generateUniqueId();
            yield {
              type: "chunk",
              content: contentChunk,
              chunkId,
            };
          }
          if (reasoningChunk) {
            reasoningContent += reasoningChunk;
            const chunkId = generateUniqueId();
            yield {
              type: "reasoningChunk",
              content: reasoningChunk,
              chunkId,
            };
          }
        }

        if (delta?.toolCalls) {
          for (const toolCall of delta.toolCalls) {
            if (toolCall.index !== undefined) {
              const _toolCall = _toolCalls[toolCall.index] || { id: "", function: { name: "", arguments: "" } };
              if (toolCall.id) _toolCall.id += toolCall.id;
              if (toolCall.function) {
                if (toolCall.function.name) _toolCall.function.name += toolCall.function.name;
                if (toolCall.function.arguments) _toolCall.function.arguments += toolCall.function.arguments;
              }
              _toolCalls[toolCall.index] = _toolCall;
            }
          }
        }

        if (chunk.data.usage) {
          inputTokens = chunk.data.usage?.promptTokens;
          outputTokens = chunk.data.usage?.completionTokens;
        }
      }
    } catch (e: unknown) {
      error = this.parseMistralError(e);
    }

    const durationMs = Date.now() - start;

    // Determine stop reason and error message
    const stopReason = config.abortSignal?.aborted ? "userCancelled" : error ? "generationError" : "completed";

    // Log non-abort errors
    if (error && stopReason === "generationError") {
      config.logger?.error("MistralProvider", `Stream error: ${error.message}`);
    }

    const toolCalls: LlmToolCall[] = _toolCalls.map((call) => {
      let parsedArgs: any = null;
      let parseError: Error | null = null;
      try {
        parsedArgs = LlmToolKit.deserialize(call.function.arguments);
      } catch (e: any) {
        parseError = e instanceof Error ? e : new Error("Unable to parse tool call arguments");
      }

      const approvalState: LlmToolCall["approvalState"] = config.tools?.getTool(call.function.name)
        ?.requiresConfirmation
        ? "requiresApproval"
        : "noApprovalRequired";

      const base = {
        id: generateUniqueId(),
        request: {
          id: call.id,
          function: {
            name: call.function.name,
            arguments: parsedArgs ?? {},
          },
        },
        approvalState,
      };

      if (parseError) {
        return {
          ...base,
          executionState: "error" as const,
          result: null,
          error: {
            type: parseError.name || "ToolArgumentParseError",
            message: parseError.message || "Invalid tool call arguments",
            numberOfAttempts: 1,
            lastAttempt: new Date(),
          },
        };
      }

      return {
        ...base,
        executionState: "pending" as const,
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

    if (_toolCalls.length > 0) {
      yield {
        type: "response",
        role: "assistant_with_tools",
        content,
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
        content,
        reasoningContent,
        meta,
        stopReason,
        error: stopReason === "generationError" ? error : undefined,
      };
    }
  }

  async getAvailableModels(): Promise<string[]> {
    const models = await this.client.models.list();
    return models.data?.map((model) => model.id) ?? [];
  }

  async createEmbedding(model: string, text: string, abortSignal?: AbortSignal): Promise<number[]> {
    const response = await this.client.embeddings.create(
      {
        model,
        inputs: text,
      },
      abortSignal ? { fetchOptions: { signal: abortSignal } } : undefined,
    );

    if (!response || !response.data || !response.data || response.data.length === 0 || !response.data[0].embedding) {
      throw new Error("Failed to create embedding");
    }

    return response.data[0].embedding;
  }
}
