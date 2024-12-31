import ollama from "ollama";

import {LlmCoreProvider, LlmGenerationConfig, LlmMessage, LlmStreamResponse, LlmStreamResponseChunk} from "../../shared";
import {convertLlmMessagesToOllamaMessages} from "./convert-llm-message";

export interface OllamaConfig {
  apiKey?: string;
  apiUrl?: string;
  defaultTemperature?: number;
}

const _provider = "OllamaProvider";

/** Provides access to local Ollama server */
export class OllamaProvider implements LlmCoreProvider {
  public defaultTemperature;

  constructor({defaultTemperature}: OllamaConfig = {}) {
    this.defaultTemperature = defaultTemperature ?? 0;
  }

  async generateResponse(model: string, messages: LlmMessage[], config: LlmGenerationConfig = {}) {
    const start = Date.now();

    const response = await ollama.chat({
      model,
      messages: await convertLlmMessagesToOllamaMessages(messages),
      format: config.json ? "json" : undefined,
      options: {
        temperature: config.temperature || this.defaultTemperature,
      }
    });

    const durationMs = Date.now() - start;

    const inputTokens = response.prompt_eval_count; // Somewhat undocumented at the moment
    const outputTokens = response.eval_count; // Somewhat undocumented at the moment

    const content = response.message.content;

    return {
      content,
      meta: {
        model,
        _provider,
        durationMs,
        inputTokens,
        outputTokens,
      }
    };
  }

  async* generateResponseStream(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {}
  ): AsyncGenerator<LlmStreamResponseChunk, LlmStreamResponse, unknown> {
    const start = Date.now();

    const stream = await ollama.chat({
      model,
      messages: await convertLlmMessagesToOllamaMessages(messages),
      stream: true,
      format: config.json ? "json" : undefined,
      options: {
        temperature: config.temperature || this.defaultTemperature,
      }
    });

    let content = "";
    for await (const chunk of stream) {
      const contentChunk = chunk.message.content;
      if (contentChunk) {
        content += contentChunk;
        yield {type: "chunk", content: contentChunk};
      }
    }

    const durationMs = Date.now() - start;

    const inputTokens = undefined;
    const outputTokens = undefined;

    return {
      type: "response",
      content,
      meta: {
        model,
        _provider,
        durationMs,
        inputTokens,
        outputTokens,
      }
    };
  }

  async getAvailableModels(): Promise<string[]> {
    const {models} = await ollama.ps();
    return models.map(model => model.name);
  }
}
