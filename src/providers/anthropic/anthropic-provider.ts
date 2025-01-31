import Anthropic from "@anthropic-ai/sdk";
import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";
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
import { convertLlmMessagesToAnthropicMessages } from "./convert-llm-message";
import { generateUniqueId, MaybeUndefined } from "../../shared";

export interface AnthropicConfig {
  apiKey?: string;
  bedrock?: {
    awsRegion?: string;
    awsAccessKey?: string;
    awsSecretKey?: string;
  };
  name?: string;
}

/** Provides access to OpenAI and other compatible services */
export class AnthropicProvider implements LlmCoreProvider {
  public readonly name;
  private readonly client: AnthropicBedrock | Anthropic;

  constructor({ apiKey, bedrock, name }: AnthropicConfig = {}) {
    this.name = name || "anthropic";
    if (bedrock) {
      const region = bedrock.awsRegion || process.env.AWS_REGION;
      const accessKeyId = bedrock.awsAccessKey || process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = bedrock.awsSecretKey || process.env.AWS_SECRET_ACCESS_KEY;

      if (!region)
        throw new Error(
          "[AnthropicProvider]: Missing AWS region. Either pass it as config.region or set the AWS_REGION environment variable",
        );
      if (!accessKeyId)
        throw new Error(
          "[AnthropicProvider]: Missing AWS access key id. Either pass it as config.accessKeyId or set the AWS_ACCESS_KEY_ID environment variable",
        );
      if (!secretAccessKey)
        throw new Error(
          "[AnthropicProvider]: Missing AWS secret access key. Either pass it as config.secretAccessKey or set the AWS_SECRET_ACCESS_KEY environment variable",
        );

      this.client = new AnthropicBedrock({
        awsRegion: region,
        awsAccessKey: accessKeyId,
        awsSecretKey: secretAccessKey,
      });
    } else {
      const _apiKey = apiKey || process.env.ANTHROPIC_API_KEY;

      if (!_apiKey)
        throw new Error(
          "[AnthropicProvider]: Missing API key. Either pass it as config.apiKey or set the ANTHROPIC_API_KEY environment variable",
        );

      this.client = new Anthropic({
        apiKey: _apiKey,
      });
    }
  }

  async generateResponse(
    model: string,
    messages: CoreLlmMessage[],
    config: LlmGenerationConfig = {},
  ): Promise<LlmResponse> {
    const start = Date.now();

    const { chatMessages, systemMessage } = await convertLlmMessagesToAnthropicMessages(messages);

    const temperature = config.temperature || undefined;

    const response = await this.client.messages.create({
      model,
      messages: chatMessages,
      temperature,
      max_tokens: config.maxTokens || 4096,
      system: systemMessage,
      tool_choice:
        config.toolChoice === "none" || !config.tools || !config.tools.hasTools
          ? undefined
          : config.toolChoice === "any"
            ? {
                type: "auto",
                disable_parallel_tool_use: config.tools?.allowParallelCalls,
              }
            : config.toolChoice === "required"
              ? {
                  type: "auto",
                  disable_parallel_tool_use: config.tools?.allowParallelCalls,
                }
              : config.toolChoice
                ? {
                    type: "tool",
                    name: config.toolChoice,
                    disable_parallel_tool_use: config.tools?.allowParallelCalls,
                  }
                : undefined,
      tools:
        config.toolChoice === "none"
          ? undefined
          : config.tools?.asLlmFunctions?.map<Anthropic.Messages.Tool>((tool) => ({
              name: tool.function.name,
              input_schema: {
                ...tool.function.parameters?.properties,
                type: "object",
              },
              description: tool.function.description,
            })),
    });

    const durationMs = Date.now() - start;

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    const content = response.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("")
      .trim();

    const toolCalls: MaybeUndefined<LlmToolCall[]> = response.content
      .filter((c) => c.type === "tool_use")
      .map((c) => ({
        id: generateUniqueId(),
        request: {
          id: c.id,
          function: {
            name: c.name,
            arguments: c.input && typeof c.input === "object" ? c.input : {},
          },
        },
        approvalState: config.tools?.getTool(c.name)?.requiresConfirmation ? "requiresApproval" : "noApprovalRequired",
        executionState: "pending",
        result: null,
        error: null,
      }));

    const provider = this.name;

    return {
      ...generateAssistantMessage(content, toolCalls),
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

    const { chatMessages, systemMessage } = await convertLlmMessagesToAnthropicMessages(messages);

    const temperature = config.temperature || undefined;

    const responseStream = await this.client.messages.create({
      model,
      messages: chatMessages,
      temperature,
      max_tokens: config.maxTokens || 4096,
      system: systemMessage,
      stream: true,
    });

    let inputTokens = undefined;
    let outputTokens = undefined;

    let content = "";

    for await (const chunk of responseStream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        content += chunk.delta.text;
        yield { type: "chunk", content: chunk.delta.text };
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

    const provider = this.name;

    yield {
      type: "response",
      content,
      role: "assistant",
      meta: {
        model,
        provider,
        durationMs,
        temperature,
        inputTokens,
        outputTokens,
      },
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createEmbedding(model: string, text: string): Promise<number[]> {
    throw new Error("Embeddings are not yet supported for Anthropic");
  }
}
