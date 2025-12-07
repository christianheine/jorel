import Groq from "groq-sdk";
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
} from "..";
import { firstEntry, generateUniqueId, MaybeUndefined } from "../../shared";
import { LlmToolKit } from "../../tools";
import { toolChoiceToGroq } from "./convert-inputs";
import { convertLlmMessagesToGroqMessages } from "./convert-llm-message";

export interface GroqConfig {
  apiKey?: string;
  apiUrl?: string;
  name?: string;
}

/**
 *  Provides access to Groq and other compatible services
 *  @deprecated: use GroqProvider instead
 */
export class GroqProviderNative implements LlmCoreProvider {
  public readonly name;
  readonly client: Groq;

  constructor({ apiKey, apiUrl, name }: GroqConfig = {}) {
    this.name = name || "groq";
    this.client = new Groq({
      apiKey: apiKey ?? process.env.Groq_API_KEY,
      baseURL: apiUrl,
    });
  }

  async generateResponse(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): Promise<LlmResponse> {
    const start = Date.now();

    const temperature = config.temperature ?? undefined;

    const response = await this.client.chat.completions.create({
      model,
      messages: await convertLlmMessagesToGroqMessages(messages),
      temperature,
      max_tokens: config.maxTokens || undefined,
      response_format: config.json ? { type: "json_object" } : { type: "text" },
      tools: config.tools?.asLlmFunctions,
      parallel_tool_calls: config.tools && config.tools.hasTools ? config.tools.allowParallelCalls : undefined,
      tool_choice: toolChoiceToGroq(config.toolChoice),
    });

    const durationMs = Date.now() - start;

    const inputTokens = response.usage?.prompt_tokens;
    const outputTokens = response.usage?.completion_tokens;

    const message = response.choices[0].message;

    const toolCalls: MaybeUndefined<LlmToolCall[]> = message.tool_calls?.map((call) => ({
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
    }));

    const provider = this.name;

    return {
      ...generateAssistantMessage(message.content, message.reasoning ?? null, toolCalls),
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
    config: Omit<LlmGenerationConfig, "tools" | "toolChoice"> = {},
  ): AsyncGenerator<LlmStreamProviderResponseChunkEvent | LlmStreamResponseEvent, void, unknown> {
    const start = Date.now();

    const temperature = config.temperature ?? undefined;

    let response: Awaited<ReturnType<typeof this.client.chat.completions.create>>;

    try {
      response = await this.client.chat.completions.create({
        model,
        messages: await convertLlmMessagesToGroqMessages(messages),
        temperature,
        response_format: config.json ? { type: "json_object" } : { type: "text" },
        max_tokens: config.maxTokens || undefined,
        stream: true,
      });
    } catch (error: unknown) {
      const isAbort =
        error instanceof Error && (error.message.toLowerCase().includes("aborted") || error.name === "AbortError");

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

    let content = "";
    let reasoningContent = "";

    let error: LlmError | undefined;

    const provider = this.name;

    try {
      for await (const chunk of response) {
        const contentChunk = firstEntry(chunk.choices)?.delta?.content;
        if (contentChunk) {
          content += contentChunk;
          const chunkId = generateUniqueId();
          yield { type: "chunk", content: contentChunk, chunkId };
        }
        const reasoningChunk = firstEntry(chunk.choices)?.delta?.reasoning;
        if (reasoningChunk) {
          reasoningContent += reasoningChunk;
          const chunkId = generateUniqueId();
          yield { type: "reasoningChunk", content: reasoningChunk, chunkId };
        }
      }
    } catch (e: unknown) {
      error = {
        message: e instanceof Error ? e.message : String(e),
        type: "unknown",
      };
    }

    const durationMs = Date.now() - start;

    const inputTokens = undefined;
    const outputTokens = undefined;

    // Determine stop reason and error message
    const stopReason = config.abortSignal?.aborted ? "userCancelled" : error ? "generationError" : "completed";

    // Log non-abort errors
    if (error && stopReason === "generationError") {
      config.logger?.error("GroqProviderNative", `Stream error: ${error.message}`);
    }

    yield {
      type: "response",
      role: "assistant",
      content,
      reasoningContent,
      meta: {
        model,
        provider,
        temperature,
        durationMs,
        inputTokens,
        outputTokens,
      },
      stopReason,
      error: stopReason === "generationError" ? error : undefined,
    };
  }

  async getAvailableModels(): Promise<string[]> {
    const models = await this.client.models.list();
    return models.data.map((model) => model.id);
  }

  async createEmbedding(model: string, text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model,
      input: text,
    });

    if (!response || !response.data || !response.data || response.data.length === 0) {
      throw new Error("Failed to create embedding");
    }

    if (!Array.isArray(response.data[0].embedding)) {
      throw new Error("Received unsupported embedding format");
    }

    return response.data[0].embedding;
  }
}
