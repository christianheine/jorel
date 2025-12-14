import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";
import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { Stream } from "@anthropic-ai/sdk/streaming";
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
import { generateUniqueId, JorElAbortError, JorElLlmError, MaybeUndefined } from "../../shared";
import { LlmToolKit } from "../../tools";
import { convertLlmMessagesToAnthropicMessages } from "./convert-llm-message";

export interface AnthropicConfig {
  apiKey?: string;
  bedrock?: {
    awsRegion?: string;
    awsAccessKey?: string;
    awsSecretKey?: string;
  };
  name?: string;
  maxRetries?: number;
  timeout?: number;
}

/** Provides access to OpenAI and other compatible services */
export class AnthropicProvider implements LlmCoreProvider {
  static readonly defaultName = "anthropic";

  public readonly name;
  readonly client: AnthropicBedrock | Anthropic;

  constructor({ apiKey, bedrock, name, maxRetries, timeout }: AnthropicConfig = {}) {
    this.name = name || AnthropicProvider.defaultName;
    if (bedrock) {
      const region = bedrock.awsRegion || process.env.AWS_REGION;
      const accessKeyId = bedrock.awsAccessKey || process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = bedrock.awsSecretKey || process.env.AWS_SECRET_ACCESS_KEY;

      if (!region)
        throw new Error(
          "[AnthropicProvider]: Missing AWS region. Either pass it as config.region or set the AWS_REGION environment variable",
        );
      if (!accessKeyId)
        throw new Error(
          "[AnthropicProvider]: Missing AWS access key id. Either pass it as config.accessKeyId or set the AWS_ACCESS_KEY_ID environment variable",
        );
      if (!secretAccessKey)
        throw new Error(
          "[AnthropicProvider]: Missing AWS secret access key. Either pass it as config.secretAccessKey or set the AWS_SECRET_ACCESS_KEY environment variable",
        );

      this.client = new AnthropicBedrock({
        awsRegion: region,
        awsAccessKey: accessKeyId,
        awsSecretKey: secretAccessKey,
        maxRetries,
        timeout,
      });
    } else {
      const _apiKey = apiKey || process.env.ANTHROPIC_API_KEY;

      if (!_apiKey)
        throw new Error(
          "[AnthropicProvider]: Missing API key. Either pass it as config.apiKey or set the ANTHROPIC_API_KEY environment variable",
        );

      this.client = new Anthropic({
        apiKey: _apiKey,
        maxRetries,
        timeout,
      });
    }
  }

  // Helper method for parsing Anthropic API errors
  private parseAnthropicError(error: unknown): { message: string; type: LlmErrorType } {
    let errorMessage: string;
    let errorType: LlmErrorType = "unknown";

    // Extract error information from Anthropic SDK errors
    if (error && typeof error === "object") {
      const err = error as any;

      // Anthropic SDK errors have status property
      const status = err.status || (error instanceof APIError ? error.status : undefined);
      errorMessage = err.message || (error instanceof Error ? error.message : String(error));

      // Parse error messages that start with HTTP status codes followed by JSON
      // e.g., "404 {\"type\":\"error\",\"error\":{\"type\":\"not_found_error\",\"message\":\"model: claude-haiku-4-6\"}}"
      const statusCodeMatch = errorMessage.match(/^(\d{3})\s+(.+)$/);
      if (statusCodeMatch) {
        const statusCode = parseInt(statusCodeMatch[1], 10);
        const jsonPart = statusCodeMatch[2];

        // Try to parse the JSON part
        try {
          const parsedError = JSON.parse(jsonPart);
          if (parsedError.error?.message) {
            errorMessage = parsedError.error.message;
          } else if (parsedError.message) {
            errorMessage = parsedError.message;
          } else {
            errorMessage = jsonPart;
          }
        } catch {
          // If JSON parsing fails, use the status code to set error type and clean message
          errorMessage = jsonPart;
        }

        // Override status if we parsed it from the message
        if (!status && statusCode) {
          // Use the parsed status code
        }
      }

      // Map status codes to error types (use parsed status or SDK status)
      const finalStatus = status || (statusCodeMatch ? parseInt(statusCodeMatch[1], 10) : undefined);
      if (finalStatus === 400) {
        errorType = "invalid_request";
      } else if (finalStatus === 401) {
        errorType = "authentication_error";
      } else if (finalStatus === 403) {
        errorType = "authentication_error";
      } else if (finalStatus === 404) {
        errorType = "invalid_request";
      } else if (finalStatus === 429) {
        errorType = "rate_limit";
      } else if (finalStatus === 500 || finalStatus === 502 || finalStatus === 503) {
        errorType = "server_error";
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

    const { chatMessages, systemMessage } = await convertLlmMessagesToAnthropicMessages(messages);

    const temperature = config.temperature ?? undefined;

    let response: Anthropic.Messages.Message & {
      _request_id?: string | null;
    };

    try {
      response = await this.client.messages.create(
        {
          model,
          messages: chatMessages,
          temperature,
          max_tokens: config.maxTokens || 4096,
          system: systemMessage,
          thinking: config.reasoningEffort === "minimal" ? { type: "disabled" } : undefined,
          tool_choice:
            config.toolChoice === "none" || !config.tools || !config.tools.hasTools
              ? undefined
              : config.toolChoice === "any"
                ? {
                    type: "auto",
                    disable_parallel_tool_use: config.tools?.allowParallelCalls,
                  }
                : config.toolChoice === "required"
                  ? {
                      type: "auto",
                      disable_parallel_tool_use: config.tools?.allowParallelCalls,
                    }
                  : config.toolChoice
                    ? {
                        type: "tool",
                        name: config.toolChoice,
                        disable_parallel_tool_use: config.tools?.allowParallelCalls,
                      }
                    : undefined,
          tools:
            config.toolChoice === "none"
              ? undefined
              : config.tools?.asLlmFunctions?.map<Anthropic.Messages.Tool>((tool) => ({
                  name: tool.function.name,
                  input_schema: {
                    ...tool.function.parameters?.properties,
                    type: "object",
                  },
                  description: tool.function.description,
                })),
        },
        {
          signal: config.abortSignal,
        },
      );
    } catch (error: unknown) {
      if (error instanceof Error && error.message.toLowerCase().includes("aborted")) {
        throw new JorElAbortError("Request was aborted");
      }

      const { message, type } = this.parseAnthropicError(error);
      throw new JorElLlmError(`[AnthropicProvider] Error generating content: ${message}`, type);
    }

    const durationMs = Date.now() - start;

    const inputTokens: MaybeUndefined<number> = response.usage.input_tokens;
    const outputTokens: MaybeUndefined<number> = response.usage.output_tokens;
    const reasoningTokens: MaybeUndefined<number> = undefined;

    const content = response.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("")
      .trim();

    const reasoningContent = response.content
      .filter((c) => c.type === "thinking" || c.type === "redacted_thinking")
      .map((c) => (c.type === "thinking" ? c.thinking : c.data))
      .join("")
      .trim();

    const toolCalls: MaybeUndefined<LlmToolCall[]> = response.content
      .filter((c) => c.type === "tool_use")
      .map((c) => ({
        id: generateUniqueId(),
        request: {
          id: c.id,
          function: {
            name: c.name,
            arguments: c.input && typeof c.input === "object" ? c.input : {},
          },
        },
        approvalState: config.tools?.getTool(c.name)?.requiresConfirmation ? "requiresApproval" : "noApprovalRequired",
        executionState: "pending",
        result: null,
        error: null,
      }));

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

    const { chatMessages, systemMessage } = await convertLlmMessagesToAnthropicMessages(messages);

    const temperature = config.temperature ?? undefined;

    let responseStream: Stream<Anthropic.Messages.RawMessageStreamEvent> & {
      _request_id?: string | null;
    };

    try {
      responseStream = await this.client.messages.create(
        {
          model,
          messages: chatMessages,
          temperature,
          max_tokens: config.maxTokens || 4096,
          system: systemMessage,
          stream: true,
          thinking: config.reasoningEffort === "minimal" ? { type: "disabled" } : undefined,
          tool_choice:
            config.toolChoice === "none" || !config.tools || !config.tools.hasTools
              ? undefined
              : config.toolChoice === "any"
                ? {
                    type: "auto",
                    disable_parallel_tool_use: config.tools?.allowParallelCalls,
                  }
                : config.toolChoice === "required"
                  ? {
                      type: "auto",
                      disable_parallel_tool_use: config.tools?.allowParallelCalls,
                    }
                  : config.toolChoice
                    ? {
                        type: "tool",
                        name: config.toolChoice,
                        disable_parallel_tool_use: config.tools?.allowParallelCalls,
                      }
                    : undefined,
          tools:
            config.toolChoice === "none"
              ? undefined
              : config.tools?.asLlmFunctions?.map<Anthropic.Messages.Tool>((tool) => ({
                  name: tool.function.name,
                  input_schema: {
                    ...tool.function.parameters?.properties,
                    type: "object",
                  },
                  description: tool.function.description,
                })),
        },
        {
          signal: config.abortSignal,
        },
      );
    } catch (error: unknown) {
      const isAbort =
        error instanceof Error && (error.message.toLowerCase().includes("aborted") || error.name === "AbortError");

      const stopReason = isAbort ? "userCancelled" : "generationError";

      yield {
        type: "response",
        role: "assistant",
        content: "",
        reasoningContent: null,
        meta: {
          model,
          provider: this.name,
          temperature,
          durationMs: 0,
          inputTokens: 0,
          outputTokens: 0,
          reasoningTokens: undefined,
        },
        stopReason,
        error: stopReason === "generationError" ? this.parseAnthropicError(error) : undefined,
      };
      return;
    }

    let inputTokens: MaybeUndefined<number> = undefined;
    let outputTokens: MaybeUndefined<number> = undefined;
    const reasoningTokens: MaybeUndefined<number> = undefined;

    let content = "";
    let reasoningContent = "";

    let error: LlmError | undefined;

    const _toolCalls: { [index: number]: Anthropic.Messages.ToolUseBlock & { arguments: string } } = {};

    const provider = this.name;

    try {
      for await (const chunk of responseStream) {
        if (chunk.type === "content_block_delta") {
          if (chunk.delta.type === "text_delta") {
            content += chunk.delta.text;
            const chunkId = generateUniqueId();
            yield { type: "chunk", content: chunk.delta.text, chunkId };
          }
          if (chunk.delta.type === "thinking_delta") {
            reasoningContent += chunk.delta.thinking;
            const chunkId = generateUniqueId();
            yield { type: "reasoningChunk", content: chunk.delta.thinking, chunkId };
          }
        }

        if (chunk.type === "message_start") {
          inputTokens = (inputTokens || 0) + chunk.message.usage.input_tokens;
          outputTokens = (outputTokens || 0) + chunk.message.usage.output_tokens;
        }

        if (chunk.type === "content_block_start") {
          if (chunk.content_block.type === "tool_use") {
            _toolCalls[chunk.index] = { ...chunk.content_block, arguments: "" };
          }
        }

        if (chunk.type === "content_block_delta") {
          if (chunk.delta.type === "input_json_delta") {
            const index = chunk.index;
            const toolCall = _toolCalls[index];
            toolCall.arguments += chunk.delta.partial_json;
          }
        }

        if (chunk.type === "message_delta") {
          outputTokens = (outputTokens || 0) + chunk.usage.output_tokens;
        }
      }
    } catch (e: unknown) {
      error = this.parseAnthropicError(e);
    }

    const durationMs = Date.now() - start;

    // Determine stop reason and error message
    const stopReason = config.abortSignal?.aborted ? "userCancelled" : error ? "generationError" : "completed";

    // Log non-abort errors
    if (error && stopReason === "generationError") {
      config.logger?.error("AnthropicProvider", `Stream error: ${error.message}`);
    }

    const meta: LlmAssistantMessageMeta = {
      model,
      provider,
      temperature,
      durationMs,
      inputTokens,
      outputTokens,
      reasoningTokens,
    };

    const toolCalls: LlmToolCall[] = Object.values(_toolCalls).map((c) => {
      let parsedArgs: unknown = null;
      let parseError: Error | null = null;
      try {
        parsedArgs = LlmToolKit.deserialize(c.arguments);
      } catch (e: unknown) {
        parseError = e instanceof Error ? e : new Error("Unable to parse tool call arguments");
      }

      const approvalState: LlmToolCall["approvalState"] = config.tools?.getTool(c.name)?.requiresConfirmation
        ? "requiresApproval"
        : "noApprovalRequired";

      const base = {
        id: generateUniqueId(),
        request: {
          id: c.id,
          function: {
            name: c.name,
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

    if (toolCalls && toolCalls.length > 0) {
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
    const response = (await this.client.get("/v1/models")) as {
      data: {
        type: string;
        id: string;
        display_name: string;
        created_at: string;
      }[];
      has_more: boolean;
      first_id: string;
      last_id: string;
    };
    return response.data.map((model) => model.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createEmbedding(model: string, text: string, abortSignal?: AbortSignal): Promise<number[]> {
    throw new Error("Embeddings are not yet supported for Anthropic");
  }
}
