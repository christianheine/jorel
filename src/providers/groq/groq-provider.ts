import Groq from "groq-sdk";
import {LlmCoreProvider, LlmGenerationConfig, LlmMessage, LlmStreamResponse, LlmStreamResponseChunk} from "../../shared";
import {convertLlmMessagesToGroqMessages} from "./convert-llm-message";

export interface GroqConfig {
  apiKey?: string;
  apiUrl?: string;
  defaultTemperature?: number;
}

const _provider = "GroqProvider";

/** Provides access to Groq and other compatible services */
export class GroqProvider implements LlmCoreProvider {
  public defaultTemperature;
  private client: Groq;

  constructor({apiKey, apiUrl, defaultTemperature}: GroqConfig = {}) {
    this.client = new Groq({
      apiKey: apiKey ?? process.env.Groq_API_KEY,
      baseURL: apiUrl
    });
    this.defaultTemperature = defaultTemperature ?? 0;
  }

  async generateResponse(model: string, messages: LlmMessage[], config: LlmGenerationConfig = {}) {
    const start = Date.now();

    const response = await this.client.chat.completions.create({
      model,
      messages: await convertLlmMessagesToGroqMessages(messages),
      temperature: config.temperature || this.defaultTemperature,
      response_format: config.json ? {type: "json_object"} : {type: "text"}
    });

    const durationMs = Date.now() - start;

    const inputTokens = response.usage?.prompt_tokens;
    const outputTokens = response.usage?.completion_tokens;

    const content = response.choices[0].message.content || "";

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

  async* generateResponseStream(model: string, messages: LlmMessage[], config: LlmGenerationConfig = {}): AsyncGenerator<LlmStreamResponseChunk, LlmStreamResponse, unknown> {
    const start = Date.now();

    const response = await this.client.chat.completions.create({
      model,
      messages: await convertLlmMessagesToGroqMessages(messages),
      temperature: config.temperature || this.defaultTemperature,
      response_format: config.json ? {type: "json_object"} : {type: "text"},
      stream: true,
    });

    let content = "";
    for await (const chunk of response) {
      const contentChunk = chunk.choices[0].delta.content || "";
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
    const models = await this.client.models.list();
    return models.data.map(model => model.id);
  }
}