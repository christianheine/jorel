import ollama, { AbortableAsyncIterator, ChatResponse, EmbeddingsResponse, Ollama, ToolCall } from "ollama";

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
} from "../../providers";
import { generateRandomId, generateUniqueId, JorElAbortError, MaybeUndefined } from "../../shared";
import { jsonResponseToOllama, toolsToOllama } from "./convert-inputs";
import { convertLlmMessagesToOllamaMessages } from "./convert-llm-message";

export interface OllamaConfig {
  name?: string;
}

/** Provides access to local Ollama server */
export class OllamaProvider implements LlmCoreProvider {
  public readonly name;
  static readonly defaultName = "ollama";

  get client(): Ollama {
    return ollama;
  }

  constructor({ name }: OllamaConfig = {}) {
    this.name = name || OllamaProvider.defaultName;
  }

  async generateResponse(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): Promise<LlmResponse> {
    const start = Date.now();

    const temperature = config.temperature ?? undefined;

    // Note: Ollama SDK doesn't support AbortSignal for non-streaming requests
    // Check for cancellation before making the request
    if (config.abortSignal?.aborted) {
      throw new JorElAbortError("Request was aborted");
    }

    let response: ChatResponse;

    try {
      response = await ollama.chat({
        model,
        messages: await convertLlmMessagesToOllamaMessages(messages),
        format: jsonResponseToOllama(config.json),
        tools: toolsToOllama(config.tools),
        options: {
          temperature,
        },
      });
    } catch (error: any) {
      if (error.name === "AbortError" || (error.message && error.message.toLowerCase().includes("aborted"))) {
        throw new JorElAbortError("Request was aborted");
      }
      throw error;
    }

    const durationMs = Date.now() - start;

    const inputTokens = response.prompt_eval_count; // Somewhat undocumented at the moment
    const outputTokens = response.eval_count; // Somewhat undocumented at the moment

    const message = response.message;

    const toolCalls: MaybeUndefined<LlmToolCall[]> = message.tool_calls?.map((call) => ({
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
    }));

    const provider = this.name;

    return {
      ...generateAssistantMessage(message.content, message.thinking ?? null, toolCalls),
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

    const temperature = config.temperature ?? undefined;

    // Check for cancellation before making the request
    if (config.abortSignal?.aborted) {
      throw new JorElAbortError("Request was aborted");
    }

    let stream: AbortableAsyncIterator<ChatResponse>;

    try {
      stream = await ollama.chat({
        model,
        messages: await convertLlmMessagesToOllamaMessages(messages),
        stream: true,
        format: jsonResponseToOllama(config.json),
        tools: toolsToOllama(config.tools),
        options: {
          temperature,
        },
      });
    } catch (error: any) {
      const isAbort =
        error?.name === "AbortError" ||
        (error?.message && typeof error.message === "string" && error.message.toLowerCase().includes("aborted"));

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

    // Set up cancellation listener for Ollama's native abort support
    const abortListener = () => {
      stream.abort();
    };

    if (config.abortSignal) {
      config.abortSignal.addEventListener("abort", abortListener);
    }

    const _toolCalls: ToolCall[] = [];

    let inputTokens: MaybeUndefined<number> = undefined;
    let outputTokens: MaybeUndefined<number> = undefined;

    let content = "";
    let reasoningContent = "";

    let error: LlmError | undefined;

    try {
      for await (const chunk of stream) {
        const contentChunk = chunk.message.content;
        if (contentChunk && typeof contentChunk === "string") {
          content += contentChunk;
          const chunkId = generateUniqueId();
          yield { type: "chunk", content: contentChunk, chunkId };
        }

        if (chunk.message.thinking) {
          reasoningContent += chunk.message.thinking;
          const chunkId = generateUniqueId();
          yield { type: "reasoningChunk", content: chunk.message.thinking, chunkId };
        }

        if (chunk.message.tool_calls) {
          for (const toolCall of chunk.message.tool_calls) {
            if (!_toolCalls.some((t) => t.function.name === toolCall.function.name)) {
              _toolCalls.push(toolCall);
            }
          }
        }

        if (chunk.prompt_eval_count) {
          inputTokens = (inputTokens ?? 0) + chunk.prompt_eval_count;
        }

        if (chunk.eval_count) {
          outputTokens = (outputTokens ?? 0) + chunk.eval_count;
        }
      }
    } catch (e: unknown) {
      error = {
        message: e instanceof Error ? e.message : String(e),
        type: "unknown",
      };
    } finally {
      // Clean up the abort listener
      if (config.abortSignal) {
        config.abortSignal.removeEventListener("abort", abortListener);
      }
    }

    const durationMs = Date.now() - start;

    // Determine stop reason and error message
    const stopReason = config.abortSignal?.aborted ? "userCancelled" : error ? "generationError" : "completed";

    // Log non-abort errors
    if (error && stopReason === "generationError") {
      config.logger?.error("OllamaProvider", `Stream error: ${error.message}`);
    }

    const meta = {
      model,
      provider,
      temperature,
      durationMs,
      inputTokens,
      outputTokens,
    };

    if (_toolCalls.length > 0) {
      const toolCalls: LlmToolCall[] = _toolCalls.map((call) => ({
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
      }));

      yield {
        type: "response",
        role: "assistant_with_tools",
        content,
        reasoningContent: reasoningContent || null,
        toolCalls: toolCalls,
        meta,
        stopReason,
        error: stopReason === "generationError" ? error : undefined,
      };
    } else {
      yield {
        type: "response",
        role: "assistant",
        content,
        reasoningContent: reasoningContent || null,
        meta,
        stopReason,
        error: stopReason === "generationError" ? error : undefined,
      };
    }
  }

  async getAvailableModels(): Promise<string[]> {
    const { models } = await ollama.ps();
    return models.map((model) => model.name);
  }

  async createEmbedding(model: string, text: string, abortSignal?: AbortSignal): Promise<number[]> {
    // Note: Ollama SDK doesn't support AbortSignal for embeddings
    // Check for cancellation before making the request
    if (abortSignal?.aborted) {
      throw new JorElAbortError("Request was aborted");
    }

    const response: EmbeddingsResponse = await ollama.embeddings({
      model,
      prompt: text,
    });

    return response.embedding;
  }
}
