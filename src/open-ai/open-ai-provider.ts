import {OpenAI} from "openai";
import {LlmCoreProvider, LlmGenerationConfig, LlmMessage, LlmStreamResponse, LlmStreamResponseChunk} from "../shared";

export interface OpenAIConfig {
  apiKey?: string;
  apiUrl?: string;
  defaultTemperature?: number;
}

/** Provides access to OpenAI and other compatible services */
export class OpenAIProvider implements LlmCoreProvider {
  private client: OpenAI;
  public defaultTemperature;

  constructor({apiKey, apiUrl, defaultTemperature}: OpenAIConfig = {}) {
    this.client = new OpenAI({
      apiKey: apiKey ?? process.env.OPENAI_API_KEY,
      baseURL: apiUrl
    });
    this.defaultTemperature = defaultTemperature ?? 0;
  }

  async generateResponse(model: string, messages: LlmMessage[], config: LlmGenerationConfig = {}) {
    const response = await this.client.chat.completions.create({
      model,
      messages,
      temperature: config.temperature || this.defaultTemperature,
      response_format: config.json ? {type: "json_object"} : {type: "text"}
    });

    return {content: response.choices[0].message.content || ""};
  }

  async* generateResponseStream(model: string, messages: LlmMessage[], config: LlmGenerationConfig = {}): AsyncGenerator<LlmStreamResponseChunk, LlmStreamResponse, unknown> {
    const response = await this.client.chat.completions.create({
      model,
      messages,
      temperature: config.temperature || this.defaultTemperature,
      response_format: config.json ? {type: "json_object"} : {type: "text"},
      stream: true
    });

    let content = "";
    for await (const chunk of response) {
      const contentChunk = chunk.choices[0].delta.content || "";
      if (contentChunk) {
        content += contentChunk;
        yield {type: "chunk", content: contentChunk};
      }
    }

    return {
      type: "response", content
    };
  }
}