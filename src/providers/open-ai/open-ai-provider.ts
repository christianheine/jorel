import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  AzureOpenAI,
  BadRequestError,
  InternalServerError,
  NotFoundError,
  OpenAI,
  OpenAIError,
  PermissionDeniedError,
  RateLimitError,
  UnprocessableEntityError,
} from "openai";
import { Stream } from "openai/core/streaming";
import {
  generateAssistantMessage,
  LlmAssistantMessageMeta,
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
import { firstEntry, generateUniqueId, JorElAbortError, MaybeUndefined } from "../../shared";
import { LlmToolKit } from "../../tools";
import { jsonResponseToOpenAi, toolChoiceToOpenAi } from "./convert-inputs";
import { convertLlmMessagesToOpenAiMessages } from "./convert-llm-message";
import { OpenAiAzureConfig, OpenAIConfig, OpenAiToolCall } from "./types";

/** Provides access to OpenAI and other compatible services */
export class OpenAIProvider implements LlmCoreProvider {
  static readonly defaultName: string = "openai";

  public readonly name;
  readonly client: OpenAI | AzureOpenAI;
  readonly isAzure: boolean;

  constructor(options: OpenAiAzureConfig | OpenAIConfig = {}) {
    if (options.azure) {
      this.name = options.name || OpenAIProvider.defaultName + "-azure";
      this.client = new AzureOpenAI({
        endpoint: options.apiUrl || process.env.AZURE_OPENAI_ENDPOINT,
        apiKey: options.apiKey || process.env.AZURE_OPENAI_API_KEY,
        apiVersion: options.apiVersion || process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview",
        maxRetries: options.maxRetries || 3,
        timeout: options.timeout,
      });
      this.isAzure = true;
    } else {
      this.name = options.name || OpenAIProvider.defaultName;
      this.client = new OpenAI({
        apiKey: options.apiKey || process.env.OPENAI_API_KEY,
        baseURL: options.apiUrl || process.env.OPENAI_API_URL,
        maxRetries: options.maxRetries,
        timeout: options.timeout,
      });
      this.isAzure = false;
    }
  }

  async generateResponse(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): Promise<LlmResponse> {
    const start = Date.now();

    const temperature = config.temperature ?? undefined;

    let response: OpenAI.Chat.Completions.ChatCompletion & {
      _request_id?: string | null;
    };

    try {
      response = await this.client.chat.completions.create(
        {
          model,
          messages: await convertLlmMessagesToOpenAiMessages(messages),
          temperature,
          response_format: jsonResponseToOpenAi(config.json, config.jsonDescription),
          max_tokens: config.maxTokens,
          max_completion_tokens: config.maxCompletionTokens,
          parallel_tool_calls: config.tools && config.tools.hasTools ? config.tools.allowParallelCalls : undefined,
          tool_choice: toolChoiceToOpenAi(config.toolChoice),
          tools: config.tools?.asLlmFunctions,
          reasoning_effort: config.reasoningEffort,
          verbosity: config.verbosity,
        },
        {
          signal: config.abortSignal,
        },
      );
    } catch (error: unknown) {
      if (error instanceof OpenAIError && error.message.toLowerCase().includes("aborted")) {
        throw new JorElAbortError("Request was aborted");
      }
      throw error;
    }

    const durationMs = Date.now() - start;

    const inputTokens: MaybeUndefined<number> = response.usage?.prompt_tokens;
    const outputTokens: MaybeUndefined<number> = response.usage?.completion_tokens;
    const reasoningTokens: MaybeUndefined<number> = response.usage?.completion_tokens_details?.reasoning_tokens;

    const message = response.choices[0].message;

    const toolCalls: MaybeUndefined<LlmToolCall[]> = message.tool_calls?.map((call) => {
      if (call.type === "custom") {
        throw new Error(`Unsupported tool call type: ${call.type}`);
      }
      return {
        id: generateUniqueId(),
        request: {
          id: call.id,
          function: {
            name: call.function.name,
            arguments: LlmToolKit.deserialize(call.function.arguments),
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
    const reasoningContent = null;

    return {
      ...generateAssistantMessage(message.content, reasoningContent, toolCalls),
      meta: {
        model,
        provider,
        temperature,
        durationMs,
        inputTokens,
        outputTokens,
        reasoningTokens,
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

    let response: Stream<OpenAI.Chat.Completions.ChatCompletionChunk> & {
      _request_id?: string | null;
    };

    try {
      response = await this.client.chat.completions.create(
        {
          model,
          messages: await convertLlmMessagesToOpenAiMessages(messages),
          temperature,
          response_format: jsonResponseToOpenAi(config.json, config.jsonDescription),
          max_tokens: config.maxTokens,
          max_completion_tokens: config.maxCompletionTokens,
          stream: true,
          tools: config.tools?.asLlmFunctions,
          parallel_tool_calls: config.tools && config.tools.hasTools ? config.tools.allowParallelCalls : undefined,
          tool_choice: toolChoiceToOpenAi(config.toolChoice),
          stream_options: {
            include_usage: true,
          },
          reasoning_effort: config.reasoningEffort,
          verbosity: config.verbosity,
        },
        {
          signal: config.abortSignal,
        },
      );
    } catch (error: unknown) {
      const isAbort =
        (error instanceof OpenAIError && error.message.toLowerCase().includes("aborted")) ||
        (error instanceof Error && error.name === "AbortError");

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
          inputTokens: 0,
          outputTokens: 0,
          reasoningTokens: 0,
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

    let inputTokens: MaybeUndefined<number>;
    let outputTokens: MaybeUndefined<number>;
    let reasoningTokens: MaybeUndefined<number>;

    const _toolCalls: OpenAiToolCall[] = [];

    let content = "";
    const reasoningContent = "";

    let error: LlmError | undefined;

    try {
      for await (const chunk of response) {
        const delta = firstEntry(chunk.choices)?.delta;

        if (delta?.content) {
          content += delta.content;
          const chunkId = generateUniqueId();
          yield { type: "chunk", content: delta.content, chunkId };
        }

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const _toolCall = _toolCalls[toolCall.index] || { id: "", function: { name: "", arguments: "" } };
            if (toolCall.id) _toolCall.id += toolCall.id;
            if (toolCall.function) {
              if (toolCall.function.name) _toolCall.function.name += toolCall.function.name;
              if (toolCall.function.arguments) _toolCall.function.arguments += toolCall.function.arguments;
            }
            _toolCalls[toolCall.index] = _toolCall;
          }
        }

        if (chunk.usage) {
          inputTokens = (inputTokens || 0) + (chunk.usage?.prompt_tokens ?? 0);
          outputTokens = (outputTokens || 0) + (chunk.usage?.completion_tokens ?? 0);
          reasoningTokens = (reasoningTokens || 0) + (chunk.usage?.completion_tokens_details?.reasoning_tokens ?? 0);
        }
      }
    } catch (e: unknown) {
      // Map OpenAI SDK errors to our error types
      // https://platform.openai.com/docs/guides/error-codes
      const errorMessage = e instanceof Error ? e.message : String(e);
      const status = e instanceof APIError ? e.status : undefined;

      let type: LlmErrorType = "unknown";

      if (e instanceof BadRequestError || status === 400) {
        type = "invalid_request";
      } else if (e instanceof AuthenticationError || status === 401) {
        type = "authentication_error";
      } else if (e instanceof PermissionDeniedError || status === 403) {
        type = "authentication_error";
      } else if (e instanceof NotFoundError || status === 404) {
        type = "invalid_request";
      } else if (e instanceof UnprocessableEntityError || status === 422) {
        type = "invalid_request";
      } else if (e instanceof RateLimitError || status === 429) {
        // 429 can mean either rate limit or quota exceeded
        const lowerMessage = errorMessage.toLowerCase();
        if (lowerMessage.includes("quota") || lowerMessage.includes("exceeded your current quota")) {
          type = "quota_exceeded";
        } else {
          type = "rate_limit";
        }
      } else if (e instanceof InternalServerError || (status && status >= 500)) {
        type = "server_error";
      } else if (e instanceof APIConnectionTimeoutError) {
        type = "timeout";
      } else if (e instanceof APIConnectionError) {
        type = "network_error";
      } else {
        type = "unknown";
      }
      error = {
        message: errorMessage,
        type,
      };
    }

    const durationMs = Date.now() - start;

    const toolCalls: LlmToolCall[] = _toolCalls.map((call) => {
      let parsedArgs: unknown = null;
      let parseError: Error | null = null;
      try {
        parsedArgs = LlmToolKit.deserialize(call.function.arguments);
      } catch (e: unknown) {
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

    // Determine stop reason and error message
    const stopReason = config.abortSignal?.aborted ? "userCancelled" : error ? "generationError" : "completed";

    // Log non-abort errors
    if (error && stopReason === "generationError") {
      config.logger?.error("OpenAIProvider", `Stream error: ${error.message}`);
    }

    const meta: LlmAssistantMessageMeta = {
      model,
      provider,
      temperature,
      durationMs,
      inputTokens: inputTokens ?? undefined,
      outputTokens: outputTokens ?? undefined,
      reasoningTokens: reasoningTokens ?? undefined,
    };

    if (_toolCalls.length > 0) {
      yield {
        type: "response",
        role: "assistant_with_tools",
        content,
        reasoningContent: reasoningContent || null,
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
        reasoningContent: reasoningContent || null,
        meta,
        stopReason,
        error: stopReason === "generationError" ? error : undefined,
      };
    }
  }

  async getAvailableModels(): Promise<string[]> {
    const models = await this.client.models.list();
    return models.data.map((model) => model.id);
  }

  async createEmbedding(model: string, text: string, abortSignal?: AbortSignal): Promise<number[]> {
    const response = await this.client.embeddings.create(
      {
        model,
        input: text,
      },
      {
        signal: abortSignal,
      },
    );

    if (!response || !response.data || !response.data || response.data.length === 0) {
      throw new Error("Failed to create embedding");
    }

    return response.data[0].embedding;
  }
}
