import ollama, { Tool } from "ollama";

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
import { generateRandomId, generateUniqueId, MaybeUndefined } from "../../shared";
import { convertLlmMessagesToOllamaMessages } from "./convert-llm-message";

export interface OllamaConfig {
  apiKey?: string;
  apiUrl?: string;
  defaultTemperature?: number;
  name?: string;
}

/** Provides access to local Ollama server */
export class OllamaProvider implements LlmCoreProvider {
  public readonly name;
  public defaultTemperature;

  constructor({ defaultTemperature, name }: OllamaConfig = {}) {
    this.name = name || "ollama";
    this.defaultTemperature = defaultTemperature ?? 0;
  }

  async generateResponse(
    model: string,
    messages: CoreLlmMessage[],
    config: LlmGenerationConfig = {},
  ): Promise<LlmResponse> {
    const start = Date.now();

    const response = await ollama.chat({
      model,
      messages: await convertLlmMessagesToOllamaMessages(messages),
      format: config.json ? "json" : undefined,
      tools: config.tools?.asLlmFunctions?.map(
        (f): Tool => ({
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
        }),
      ),
      options: {
        temperature: config.temperature || this.defaultTemperature,
      },
    });

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
      ...generateAssistantMessage(message.content, toolCalls),
      meta: {
        model,
        provider,
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

    const stream = await ollama.chat({
      model,
      messages: await convertLlmMessagesToOllamaMessages(messages),
      stream: true,
      format: config.json ? "json" : undefined,
      options: {
        temperature: config.temperature || this.defaultTemperature,
      },
    });

    let content = "";
    for await (const chunk of stream) {
      const contentChunk = chunk.message.content;
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
        durationMs,
        inputTokens,
        outputTokens,
      },
    };
  }

  async getAvailableModels(): Promise<string[]> {
    const { models } = await ollama.ps();
    return models.map((model) => model.name);
  }

  async createEmbedding(model: string, text: string): Promise<number[]> {
    const response = await ollama.embeddings({
      model,
      prompt: text,
    });
    return response.embedding;
  }
}
