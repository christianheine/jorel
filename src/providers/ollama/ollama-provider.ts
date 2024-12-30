import ollama from "ollama";

import {LlmCoreProvider, LlmGenerationConfig, LlmMessage, LlmStreamResponse, LlmStreamResponseChunk} from "../../shared";
import {convertLlmMessagesToOllamaMessages} from "./convert-llm-message";

export interface OllamaConfig {
  apiKey?: string;
  apiUrl?: string;
  defaultTemperature?: number;
}

/** Provides access to local Ollama server */
export class OllamaProvider implements LlmCoreProvider {
  public defaultTemperature;

  constructor({defaultTemperature}: OllamaConfig = {}) {
    this.defaultTemperature = defaultTemperature ?? 0;
  }

  async generateResponse(model: string, messages: LlmMessage[], config: LlmGenerationConfig = {}) {
    const response = await ollama.chat({
      model,
      messages: await convertLlmMessagesToOllamaMessages(messages),
      format: config.json ? "json" : undefined,
      options: {
        temperature: config.temperature || this.defaultTemperature,
      }
    });
    return {content: response.message.content};
  }

  async* generateResponseStream(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {}
  ): AsyncGenerator<LlmStreamResponseChunk, LlmStreamResponse, unknown> {
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

    return {type: "response", content};
  }

  async getAvailableModels(): Promise<string[]> {
    const {models} = await ollama.ps();
    return models.map(model => model.name);
  }
}
