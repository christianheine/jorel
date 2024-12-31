import Anthropic from "@anthropic-ai/sdk";
import {AnthropicBedrock} from "@anthropic-ai/bedrock-sdk";

import {LlmCoreProvider, LlmGenerationConfig, LlmMessage, LlmStreamResponse, LlmStreamResponseChunk} from "../../shared";
import {convertLlmMessagesToAnthropicMessages} from "./convert-llm-message";

export interface AnthropicConfig {
  apiKey?: string;
  bedrock?: {
    awsRegion?: string;
    awsAccessKey?: string;
    awsSecretKey?: string;
  };
  defaultTemperature?: number;
}

const _provider = "AnthropicProvider";

/** Provides access to OpenAI and other compatible services */
export class AnthropicProvider implements LlmCoreProvider {
  public defaultTemperature;
  private readonly client: AnthropicBedrock | Anthropic;

  constructor({apiKey, bedrock, defaultTemperature}: AnthropicConfig = {}) {
    if (bedrock) {
      const region = bedrock.awsRegion || process.env.AWS_REGION;
      const accessKeyId = bedrock.awsAccessKey || process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = bedrock.awsSecretKey || process.env.AWS_SECRET_ACCESS_KEY;

      if (!region) throw new Error("[AnthropicProvider]: Missing AWS region. Either pass it as config.region or set the AWS_REGION environment variable");
      if (!accessKeyId) throw new Error("[AnthropicProvider]: Missing AWS access key id. Either pass it as config.accessKeyId or set the AWS_ACCESS_KEY_ID environment variable");
      if (!secretAccessKey) throw new Error("[AnthropicProvider]: Missing AWS secret access key. Either pass it as config.secretAccessKey or set the AWS_SECRET_ACCESS_KEY environment variable");

      this.client = new AnthropicBedrock({
        awsRegion: region,
        awsAccessKey: accessKeyId,
        awsSecretKey: secretAccessKey,
      });
    } else {
      const _apiKey = apiKey || process.env.ANTHROPIC_API_KEY;

      if (!_apiKey) throw new Error("[AnthropicProvider]: Missing API key. Either pass it as config.apiKey or set the ANTHROPIC_API_KEY environment variable");

      this.client = new Anthropic({
        apiKey: _apiKey
      });
    }

    this.defaultTemperature = defaultTemperature ?? 0;
  }

  async generateResponse(model: string, messages: LlmMessage[], config: LlmGenerationConfig = {}) {
    const start = Date.now();
    const {chatMessages, systemMessage} = await convertLlmMessagesToAnthropicMessages(messages);
    const response = await this.client.messages.create({
      model,
      messages: chatMessages,
      temperature: config.temperature || this.defaultTemperature,
      max_tokens: config.maxTokens || 4096,
      system: systemMessage,
      // stop_sequences: config.stopSequences || [],
      // tool_choice: config.toolChoice || undefined,
      // tools: config.tools || undefined,
    });

    const durationMs = Date.now() - start;

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    const content = response.content.map((c) => c.type === "text" ? c.text : "").join("");

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
    const {chatMessages, systemMessage} = await convertLlmMessagesToAnthropicMessages(messages);
    const responseStream = await this.client.messages.create({
      model,
      messages: chatMessages,
      temperature: config.temperature || this.defaultTemperature,
      max_tokens: config.maxTokens || 4096,
      system: systemMessage,
      stream: true,
      // stop_sequences: config.stopSequences || [],
      // tool_choice: config.toolChoice || undefined,
      // tools: config.tools || undefined,
    });

    let inputTokens = undefined;
    let outputTokens = undefined;

    let content = "";

    for await (const chunk of responseStream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        content += chunk.delta.text;
        yield {type: "chunk", content: chunk.delta.text};
      }
      if (chunk.type === "message_start") {
        inputTokens = (inputTokens || 0) + chunk.message.usage.input_tokens;
        outputTokens = (outputTokens || 0) + chunk.message.usage.output_tokens;
      }
      if (chunk.type === "message_delta") {
        outputTokens = (outputTokens || 0) + chunk.usage.output_tokens;
      }
    }

    const durationMs = Date.now() - start;


    return {
      type: "response", content,
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
    const response = (await this.client.get("/v1/models")) as {
      data: {
        type: string;
        id: string;
        display_name: string;
        created_at: string;
      }[];
      has_more: boolean;
      first_id: string;
      last_id: string;
    };
    return response.data.map((model) => model.id);
  }
}