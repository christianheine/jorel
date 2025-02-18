import { Mistral } from "@mistralai/mistralai";
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
  toolChoiceToOpenAi,
  jsonResponseToOpenAi,
} from "../../providers";
import { LlmToolKit } from "../../tools";
import { convertLlmMessagesToMistralMessages } from "./convert-llm-message";

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface MistralConfig {
  apiKey?: string;
}

/** Provides access to OpenAI and other compatible services */
export class MistralProvider implements LlmCoreProvider {
  public readonly name;
  readonly client: Mistral;

  constructor({ apiKey }: MistralConfig = {}) {
    this.name = "mistral";
    this.client = new Mistral({
      apiKey: apiKey ?? process.env.MISTRAL_API_KEY,
    });
  }

  async generateResponse(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): Promise<LlmResponse> {
    const start = Date.now();

    const temperature = config.temperature ?? undefined;

    const response = await this.client.chat.complete({
      model,
      messages: await convertLlmMessagesToMistralMessages(messages),
      temperature,
      responseFormat: jsonResponseToOpenAi(config.json),
      maxTokens: config.maxTokens,
      toolChoice: toolChoiceToOpenAi(config.toolChoice),
      tools: config.tools?.asLlmFunctions?.map((f) => ({
        type: "function",
        function: {
          name: f.function.name,
          description: f.function.description,
          parameters: {
            type: f.function.parameters?.type ?? "object",
            properties: f.function.parameters?.properties ?? ({} as Record<string, any>),
            required: f.function.parameters?.required ?? [],
          },
        },
      })),
    });

    const durationMs = Date.now() - start;

    const inputTokens: MaybeUndefined<number> = response.usage?.promptTokens;
    const outputTokens: MaybeUndefined<number> = response.usage?.completionTokens;

    const message = response.choices ? firstEntry(response.choices)?.message : undefined;

    const content = Array.isArray(message?.content)
      ? message.content.map((c) => (c.type === "text" ? c.text : "")).join("")
      : (message?.content ?? null);

    const toolCalls: MaybeUndefined<LlmToolCall[]> = message?.toolCalls?.map((call) => {
      return {
        id: generateUniqueId(),
        request: {
          id: call.id ?? generateUniqueId(),
          function: {
            name: call.function.name,
            arguments:
              typeof call.function.arguments == "string"
                ? LlmToolKit.deserialize(call.function.arguments)
                : call.function.arguments,
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
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): AsyncGenerator<LlmStreamResponseChunk | LlmStreamResponse | LlmStreamResponseWithToolCalls, void, unknown> {
    const start = Date.now();

    const temperature = config.temperature ?? undefined;

    const response = await this.client.chat.stream({
      model,
      messages: await convertLlmMessagesToMistralMessages(messages),
      temperature,
      responseFormat: jsonResponseToOpenAi(config.json),
      maxTokens: config.maxTokens,
      stream: true,
      tools: config.tools?.asLlmFunctions?.map((f) => ({
        type: "function",
        function: {
          name: f.function.name,
          description: f.function.description,
          parameters: {
            type: f.function.parameters?.type ?? "object",
            properties: f.function.parameters?.properties ?? ({} as Record<string, any>),
            required: f.function.parameters?.required ?? [],
          },
        },
      })),
      toolChoice: toolChoiceToOpenAi(config.toolChoice),
    });

    let inputTokens: MaybeUndefined<number>;
    let outputTokens: MaybeUndefined<number>;

    const _toolCalls: ToolCall[] = [];

    let content = "";
    for await (const chunk of response) {
      const delta = firstEntry(chunk.data.choices)?.delta;
      if (delta?.content) {
        content += delta.content;
        yield {
          type: "chunk",
          content:
            typeof delta.content === "string"
              ? delta.content
              : delta.content.map((c) => (c.type === "text" ? c.text : "")).join(""),
        };
      }

      if (delta?.toolCalls) {
        for (const toolCall of delta.toolCalls) {
          if (toolCall.index !== undefined) {
            const _toolCall = _toolCalls[toolCall.index] || { id: "", function: { name: "", arguments: "" } };
            if (toolCall.id) _toolCall.id += toolCall.id;
            if (toolCall.function) {
              if (toolCall.function.name) _toolCall.function.name += toolCall.function.name;
              if (toolCall.function.arguments) _toolCall.function.arguments += toolCall.function.arguments;
            }
            _toolCalls[toolCall.index] = _toolCall;
          }
        }
      }

      if (chunk.data.usage) {
        inputTokens = chunk.data.usage?.promptTokens;
        outputTokens = chunk.data.usage?.completionTokens;
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
    return models.data?.map((model) => model.id) ?? [];
  }

  async createEmbedding(model: string, text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model,
      inputs: text,
    });

    if (!response || !response.data || !response.data || response.data.length === 0 || !response.data[0].embedding) {
      throw new Error("Failed to create embedding");
    }

    return response.data[0].embedding;
  }
}
