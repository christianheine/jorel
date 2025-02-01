import Groq from "groq-sdk";
import {
  CoreLlmMessage,
  generateAssistantMessage,
  LlmCoreProvider,
  LlmGenerationConfig,
  LlmResponse,
  LlmStreamResponse,
  LlmStreamResponseChunk,
  LlmToolCall,
} from "../../providers";
import { firstEntry, generateUniqueId, MaybeUndefined } from "../../shared";
import { convertLlmMessagesToGroqMessages } from "./convert-llm-message";
import { LlmToolKit } from "../../tools";

export interface GroqConfig {
  apiKey?: string;
  apiUrl?: string;
  name?: string;
}

/** Provides access to Groq and other compatible services */
export class GroqProvider implements LlmCoreProvider {
  public readonly name;
  private client: Groq;

  constructor({ apiKey, apiUrl, name }: GroqConfig = {}) {
    this.name = name || "groq";
    this.client = new Groq({
      apiKey: apiKey ?? process.env.Groq_API_KEY,
      baseURL: apiUrl,
    });
  }

  async generateResponse(
    model: string,
    messages: CoreLlmMessage[],
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
      tool_choice:
        config.toolChoice === "auto"
          ? "auto"
          : config.toolChoice === "required"
            ? "required"
            : config.toolChoice === "none"
              ? "none"
              : config.toolChoice
                ? { type: "function", function: { name: config.toolChoice } }
                : undefined,
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
      ...generateAssistantMessage(message.content, toolCalls),
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
    messages: CoreLlmMessage[],
    config: Omit<LlmGenerationConfig, "tools" | "toolChoice"> = {},
  ): AsyncGenerator<LlmStreamResponseChunk | LlmStreamResponse, void, unknown> {
    const start = Date.now();

    const temperature = config.temperature ?? undefined;

    const response = await this.client.chat.completions.create({
      model,
      messages: await convertLlmMessagesToGroqMessages(messages),
      temperature,
      response_format: config.json ? { type: "json_object" } : { type: "text" },
      max_tokens: config.maxTokens || undefined,
      stream: true,
    });

    let content = "";
    for await (const chunk of response) {
      const contentChunk = firstEntry(chunk.choices)?.delta?.content;
      if (contentChunk) {
        content += contentChunk;
        yield { type: "chunk", content: contentChunk };
      }
    }

    const durationMs = Date.now() - start;

    const inputTokens = undefined;
    const outputTokens = undefined;

    const provider = this.name;

    yield {
      type: "response",
      role: "assistant",
      content,
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
