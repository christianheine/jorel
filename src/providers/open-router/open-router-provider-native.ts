import { OpenRouter } from "@openrouter/sdk";
import { EventStream } from "@openrouter/sdk/esm/lib/event-streams";
import type { ChatStreamingResponseChunkData } from "@openrouter/sdk/esm/models";
import { SendChatCompletionRequestResponse } from "@openrouter/sdk/esm/models/operations";
import {
  generateAssistantMessage,
  LlmAssistantMessageMeta,
  LlmCoreProvider,
  LlmGenerationConfig,
  LlmMessage,
  LlmResponse,
  LlmStreamProviderResponseChunkEvent,
  LlmStreamResponseEvent,
  LlmToolCall,
} from "../../providers";
import { firstEntry, generateUniqueId, JorElAbortError, MaybeUndefined } from "../../shared";
import { LlmToolKit } from "../../tools";
import { jsonResponseToOpenRouter, reasoningToOpenRouter, toolChoiceToOpenRouter } from "./convert-inputs";
import { convertLlmMessagesToOpenRouterMessages, extractTextContent } from "./convert-llm-message";
import { OpenRouterConfig } from "./types";

interface OpenRouterToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Provides access to OpenRouter using their native SDK
 */
export class OpenRouterProviderNative implements LlmCoreProvider {
  static readonly defaultName = "open-router";

  public readonly name: string;
  readonly client: OpenRouter;

  constructor(config?: OpenRouterConfig) {
    this.name = config?.name || OpenRouterProviderNative.defaultName;
    this.client = new OpenRouter({
      apiKey: config?.apiKey || process.env.OPEN_ROUTER_API_KEY,
    });
  }

  async generateResponse(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): Promise<LlmResponse> {
    const start = Date.now();

    const temperature = config.temperature ?? undefined;

    // Convert LlmMessage[] to OpenRouter format
    const openRouterMessages = await convertLlmMessagesToOpenRouterMessages(messages);

    let response: SendChatCompletionRequestResponse;

    try {
      response = await this.client.chat.send(
        {
          model,
          messages: openRouterMessages,
          temperature,
          maxTokens: config.maxTokens,
          responseFormat: jsonResponseToOpenRouter(config.json, config.jsonDescription),
          tools: config.tools?.asLlmFunctions,
          toolChoice: toolChoiceToOpenRouter(config.toolChoice),
          reasoning: reasoningToOpenRouter(
            config.reasoningEffort ?? undefined,
            config.reasoningSummaryVerbosity ?? undefined,
          ),
          stream: false,
          maxCompletionTokens: config.maxCompletionTokens,
        },
        {
          signal: config.abortSignal,
        },
      );
    } catch (error: unknown) {
      if (error instanceof Error && error.message.toLowerCase().includes("aborted")) {
        throw new JorElAbortError("Request was aborted");
      }
      throw error;
    }

    const durationMs = Date.now() - start;

    const inputTokens: MaybeUndefined<number> = response.usage?.promptTokens;
    const outputTokens: MaybeUndefined<number> = response.usage?.completionTokens;
    const reasoningTokens: MaybeUndefined<number> =
      response.usage?.completionTokensDetails?.reasoningTokens ?? undefined;

    const message = response.choices[0].message;

    const toolCalls: MaybeUndefined<LlmToolCall[]> = message.toolCalls?.map((call) => {
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

    // Extract text content (handles both string and array formats)
    const textContent = extractTextContent(message.content);
    const reasoningContent = message.reasoning ?? null;

    return {
      ...generateAssistantMessage(textContent, reasoningContent, toolCalls),
      meta: {
        model,
        provider,
        temperature,
        durationMs,
        inputTokens: inputTokens ?? undefined,
        outputTokens: outputTokens ?? undefined,
        reasoningTokens: reasoningTokens ?? undefined,
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

    // Convert LlmMessage[] to OpenRouter format
    const openRouterMessages = await convertLlmMessagesToOpenRouterMessages(messages);

    let stream: EventStream<ChatStreamingResponseChunkData>;

    try {
      stream = await this.client.chat.send(
        {
          model,
          messages: openRouterMessages,
          temperature,
          maxTokens: config.maxTokens,
          responseFormat: jsonResponseToOpenRouter(config.json, config.jsonDescription),
          tools: config.tools?.asLlmFunctions,
          toolChoice: toolChoiceToOpenRouter(config.toolChoice),
          reasoning: reasoningToOpenRouter(
            config.reasoningEffort ?? undefined,
            config.reasoningSummaryVerbosity ?? undefined,
          ),
          stream: true,
          maxCompletionTokens: config.maxCompletionTokens,
          streamOptions: {
            includeUsage: true,
          },
        },
        {
          signal: config.abortSignal,
        },
      );
    } catch (error: unknown) {
      if (error instanceof Error && error.message.toLowerCase().includes("aborted")) {
        throw new JorElAbortError("Request was aborted");
      }
      throw error;
    }

    let inputTokens: MaybeUndefined<number>;
    let outputTokens: MaybeUndefined<number>;
    let reasoningTokens: MaybeUndefined<number>;

    const _toolCalls: OpenRouterToolCall[] = [];

    let content = "";
    let reasoningContent = "";

    for await (const chunk of stream) {
      const delta = firstEntry(chunk.choices)?.delta;

      if (delta?.content) {
        content += delta.content;
        const chunkId = generateUniqueId();
        yield { type: "chunk", content: delta.content, chunkId };
      }

      if (delta?.reasoning) {
        reasoningContent += delta.reasoning;
        const chunkId = generateUniqueId();
        yield { type: "reasoningChunk", content: delta.reasoning, chunkId };
      }

      if (delta?.toolCalls) {
        for (const toolCall of delta.toolCalls) {
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
        inputTokens = (inputTokens || 0) + (chunk.usage?.promptTokens ?? 0);
        outputTokens = (outputTokens || 0) + (chunk.usage?.completionTokens ?? 0);
        reasoningTokens = (reasoningTokens || 0) + (chunk.usage?.completionTokensDetails?.reasoningTokens ?? 0);
      }
    }

    const durationMs = Date.now() - start;

    const provider = this.name;

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
        reasoningContent,
        toolCalls,
        meta,
      };
    } else {
      yield {
        type: "response",
        role: "assistant",
        content,
        reasoningContent,
        meta,
      };
    }
  }

  async getAvailableModels(): Promise<string[]> {
    const response = await this.client.models.list();
    return response.data.map((model) => model.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createEmbedding(model: string, text: string, abortSignal?: AbortSignal): Promise<number[]> {
    // OpenRouter SDK doesn't currently support abort signals for embeddings
    const response = await this.client.embeddings.generate({
      model,
      input: text,
    });

    if (typeof response === "string") {
      throw new Error("Received unexpected string response from embeddings endpoint");
    }

    if (!response || !response.data || response.data.length === 0) {
      throw new Error("Failed to create embedding");
    }

    const embedding = response.data[0].embedding;

    if (typeof embedding === "string") {
      const buffer = Buffer.from(embedding, "base64");
      const floatArray = new Float32Array(buffer.buffer);
      return Array.from(floatArray);
    }

    return embedding;
  }
}
