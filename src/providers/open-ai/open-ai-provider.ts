import { OpenAI } from "openai";
import { firstEntry, generateUniqueId, MaybeUndefined } from "../../shared";
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
import { convertLlmMessagesToOpenAiMessages } from "./convert-llm-message";
import { LlmToolKit } from "../../tools";
import { jsonResponseToOpenAi, toolChoiceToOpenAi } from "./convert-inputs";

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIConfig {
  apiKey?: string;
  apiUrl?: string;
  name?: string;
}

/** Provides access to OpenAI and other compatible services */
export class OpenAIProvider implements LlmCoreProvider {
  public readonly name;
  readonly client: OpenAI;

  constructor({ apiKey, apiUrl, name }: OpenAIConfig = {}) {
    this.name = name || "openai";
    this.client = new OpenAI({
      apiKey: apiKey ?? process.env.OPENAI_API_KEY,
      baseURL: apiUrl,
    });
  }

  async generateResponse(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): Promise<LlmResponse> {
    const start = Date.now();

    const temperature = config.temperature ?? undefined;

    const response = await this.client.chat.completions.create({
      model,
      messages: await convertLlmMessagesToOpenAiMessages(messages),
      temperature,
      response_format: jsonResponseToOpenAi(config.json, config.jsonDescription),
      max_tokens: config.maxTokens,
      parallel_tool_calls: config.tools && config.tools.hasTools ? config.tools.allowParallelCalls : undefined,
      tool_choice: toolChoiceToOpenAi(config.toolChoice),
      tools: config.tools?.asLlmFunctions,
    });

    const durationMs = Date.now() - start;

    const inputTokens: MaybeUndefined<number> = response.usage?.prompt_tokens;
    const outputTokens: MaybeUndefined<number> = response.usage?.completion_tokens;

    const message = response.choices[0].message;

    const toolCalls: MaybeUndefined<LlmToolCall[]> = message.tool_calls?.map((call) => {
      return {
        id: generateUniqueId(),
        request: {
          id: call.id,
          function: {
            name: call.function.name,
            arguments: LlmToolKit.deserialize(call.function.arguments),
          },
        },
        approvalState: config.tools?.getTool(call.function.name)?.requiresConfirmation
          ? "requiresApproval"
          : "noApprovalRequired",
        executionState: "pending",
        result: null,
        error: null,
      };
    });

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

    const response = await this.client.chat.completions.create({
      model,
      messages: await convertLlmMessagesToOpenAiMessages(messages),
      temperature,
      response_format: jsonResponseToOpenAi(config.json, config.jsonDescription),
      max_tokens: config.maxTokens,
      stream: true,
      tools: config.tools?.asLlmFunctions,
      parallel_tool_calls: config.tools && config.tools.hasTools ? config.tools.allowParallelCalls : undefined,
      tool_choice: toolChoiceToOpenAi(config.toolChoice),
      stream_options: {
        include_usage: true,
      },
    });

    let inputTokens: MaybeUndefined<number>;
    let outputTokens: MaybeUndefined<number>;

    const _toolCalls: ToolCall[] = [];

    let content = "";
    for await (const chunk of response) {
      const delta = firstEntry(chunk.choices)?.delta;
      if (delta?.content) {
        content += delta.content;
        yield { type: "chunk", content: delta.content };
      }

      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          const _toolCall = _toolCalls[toolCall.index] || { id: "", function: { name: "", arguments: "" } };
          if (toolCall.id) _toolCall.id += toolCall.id;
          if (toolCall.function) {
            if (toolCall.function.name) _toolCall.function.name += toolCall.function.name;
            if (toolCall.function.arguments) _toolCall.function.arguments += toolCall.function.arguments;
          }
          _toolCalls[toolCall.index] = _toolCall;
        }
      }

      if (chunk.usage) {
        inputTokens = chunk.usage?.prompt_tokens;
        outputTokens = chunk.usage?.completion_tokens;
      }
    }

    const durationMs = Date.now() - start;

    const provider = this.name;

    const toolCalls: MaybeUndefined<LlmToolCall[]> = _toolCalls.map((call) => {
      return {
        id: generateUniqueId(),
        request: {
          id: call.id,
          function: {
            name: call.function.name,
            arguments: LlmToolKit.deserialize(call.function.arguments),
          },
        },
        approvalState: config.tools?.getTool(call.function.name)?.requiresConfirmation
          ? "requiresApproval"
          : "noApprovalRequired",
        executionState: "pending",
        result: null,
        error: null,
      };
    });

    const meta = {
      model,
      provider,
      temperature,
      durationMs,
      inputTokens,
      outputTokens,
    };

    if (_toolCalls.length > 0) {
      yield {
        type: "response",
        role: "assistant_with_tools",
        content,
        toolCalls,
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
    const models = await this.client.models.list();
    return models.data.map((model) => model.id);
  }

  async createEmbedding(model: string, text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model,
      input: text,
    });

    if (!response || !response.data || !response.data || response.data.length === 0) {
      throw new Error("Failed to create embedding");
    }

    return response.data[0].embedding;
  }
}
