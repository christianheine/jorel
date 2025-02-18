import ollama, { Ollama, ToolCall } from "ollama";

import {
  LlmMessage,
  generateAssistantMessage,
  LlmCoreProvider,
  LlmGenerationConfig,
  LlmResponse,
  LlmStreamResponse,
  LlmStreamResponseChunk,
  LlmStreamResponseWithToolCalls,
  LlmToolCall,
} from "../../providers";
import { generateRandomId, generateUniqueId, MaybeUndefined } from "../../shared";
import { jsonResponseToOllama, toolsToOllama } from "./convert-inputs";
import { convertLlmMessagesToOllamaMessages } from "./convert-llm-message";

export interface OllamaConfig {
  name?: string;
}

/** Provides access to local Ollama server */
export class OllamaProvider implements LlmCoreProvider {
  public readonly name;

  get client(): Ollama {
    return ollama;
  }

  constructor({ name }: OllamaConfig = {}) {
    this.name = name || "ollama";
  }

  async generateResponse(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): Promise<LlmResponse> {
    const start = Date.now();

    const temperature = config.temperature ?? undefined;

    const response = await ollama.chat({
      model,
      messages: await convertLlmMessagesToOllamaMessages(messages),
      format: jsonResponseToOllama(config.json),
      tools: toolsToOllama(config.tools),
      options: {
        temperature,
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
  ): AsyncGenerator<LlmStreamResponseChunk | LlmStreamResponse | LlmStreamResponseWithToolCalls, void, unknown> {
    const start = Date.now();

    const temperature = config.temperature ?? undefined;

    const stream = await ollama.chat({
      model,
      messages: await convertLlmMessagesToOllamaMessages(messages),
      stream: true,
      format: jsonResponseToOllama(config.json),
      tools: toolsToOllama(config.tools),
      options: {
        temperature,
      },
    });

    const _toolCalls: ToolCall[] = [];

    let inputTokens: MaybeUndefined<number> = undefined;
    let outputTokens: MaybeUndefined<number> = undefined;

    let content = "";
    for await (const chunk of stream) {
      const contentChunk = chunk.message.content;
      if (contentChunk) {
        content += contentChunk;
        yield { type: "chunk", content: contentChunk };
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

    const durationMs = Date.now() - start;

    const provider = this.name;

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
        toolCalls: toolCalls,
        meta,
      };
    } else {
      yield {
        type: "response",
        role: "assistant",
        content,
        meta,
      };
    }
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
