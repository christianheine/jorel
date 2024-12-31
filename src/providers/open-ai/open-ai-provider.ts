import {OpenAI} from "openai";
import {LlmCoreProvider, LlmGenerationConfig, LlmMessage, LlmStreamResponse, LlmStreamResponseChunk} from "../../shared";
import {convertLlmMessagesToOpenAiMessages} from "./convert-llm-message";

export interface OpenAIConfig {
  apiKey?: string;
  apiUrl?: string;
  defaultTemperature?: number;
}

const _provider = "OpenAIProvider";

/** Provides access to OpenAI and other compatible services */
export class OpenAIProvider implements LlmCoreProvider {
  public defaultTemperature;
  private client: OpenAI;

  constructor({apiKey, apiUrl, defaultTemperature}: OpenAIConfig = {}) {
    this.client = new OpenAI({
      apiKey: apiKey ?? process.env.OPENAI_API_KEY,
      baseURL: apiUrl
    });
    this.defaultTemperature = defaultTemperature ?? 0;
  }

  async generateResponse(model: string, messages: LlmMessage[], config: LlmGenerationConfig = {}) {
    const start = Date.now();

    const response = await this.client.chat.completions.create({
      model,
      messages: await convertLlmMessagesToOpenAiMessages(messages),
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
      messages: await convertLlmMessagesToOpenAiMessages(messages),
      temperature: config.temperature || this.defaultTemperature,
      response_format: config.json ? {type: "json_object"} : {type: "text"},
      stream: true,
      stream_options: {
        include_usage: true
      }
    });

    let inputTokens: number | undefined;
    let outputTokens: number | undefined;

    let content = "";
    for await (const chunk of response) {
      const contentChunk = chunk.choices[0].delta.content || "";
      if (contentChunk) {
        content += contentChunk;
        yield {type: "chunk", content: contentChunk};
      }
      if (chunk.usage) {
        inputTokens = chunk.usage?.prompt_tokens;
        outputTokens = chunk.usage?.completion_tokens;
      }
    }

    const durationMs = Date.now() - start;

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