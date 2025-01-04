import {OpenAI} from "openai";
import {_assistantMessage, LlmCoreProvider, LlmGenerationConfig, LlmMessage, LlmResponse, LlmResponseWithToolCalls, LlmStreamResponse, LlmStreamResponseChunk, LlmToolCall, MaybeUndefined} from "../../shared";
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

  async generateResponse(model: string, messages: LlmMessage[], config: LlmGenerationConfig = {}): Promise<LlmResponse | LlmResponseWithToolCalls> {
    const start = Date.now();

    const response = await this.client.chat.completions.create({
      model,
      messages: await convertLlmMessagesToOpenAiMessages(messages),
      temperature: config.temperature || this.defaultTemperature,
      response_format: config.json ? {type: "json_object"} : {type: "text"},
      max_tokens: config.maxTokens,
      parallel_tool_calls: config.tools ? config.tools.allowParallelCalls : undefined,
      tool_choice: config.toolChoice === "auto" ? "auto" : config.toolChoice === "required" ? "required" : config.toolChoice === "none" ? "none" :
        config.toolChoice ? {type: "function", function: {name: config.toolChoice}} : undefined,
      tools: config.tools?.llmFunctions,
    });

    const durationMs = Date.now() - start;

    const inputTokens: MaybeUndefined<number> = response.usage?.prompt_tokens;
    const outputTokens: MaybeUndefined<number> = response.usage?.completion_tokens;

    const message = response.choices[0].message;

    const toolCalls: MaybeUndefined<LlmToolCall[]> = message.tool_calls?.map(call => {
      return (
        {
          request: {
            id: call.id,
            function: {
              name: call.function.name,
              arguments: JSON.parse(call.function.arguments),
            }
          },
          approvalState: config.tools?.getTool(call.function.name)?.requiresConfirmation ? "requiresApproval" : "noApprovalRequired",
          executionState: "pending",
          result: null,
          error: null
        }
      );
    });

    return {
      ..._assistantMessage(message.content, toolCalls),
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

    if (config.tools && config.tools.hasTools) {
      throw new Error("Tool calls are not yet fully supported for OpenAI stream responses");
    }

    const response = await this.client.chat.completions.create({
      model,
      messages: await convertLlmMessagesToOpenAiMessages(messages),
      temperature: config.temperature || this.defaultTemperature,
      response_format: config.json ? {type: "json_object"} : {type: "text"},
      max_tokens: config.maxTokens,
      stream: true,
      tools: config.tools?.llmFunctions,
      parallel_tool_calls: config.tools ? config.tools.allowParallelCalls : undefined,
      stream_options: {
        include_usage: true
      }
    });

    let inputTokens: MaybeUndefined<number>;
    let outputTokens: MaybeUndefined<number>;

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