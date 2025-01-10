import Groq from "groq-sdk";
import {firstEntry, generateAssistantMessage, LlmCoreProvider, LlmGenerationConfig, LlmMessage, LlmResponse, LlmStreamResponse, LlmStreamResponseChunk, LlmToolCall, MaybeUndefined} from "../../shared";
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

  async generateResponse(model: string, messages: LlmMessage[], config: LlmGenerationConfig = {}): Promise<LlmResponse > {
    const start = Date.now();

    const response = await this.client.chat.completions.create({
      model,
      messages: await convertLlmMessagesToGroqMessages(messages),
      temperature: config.temperature || this.defaultTemperature,
      max_tokens: config.maxTokens || undefined,
      response_format: config.json ? {type: "json_object"} : {type: "text"},
      tools: config.tools?.llmFunctions,
      parallel_tool_calls: config.tools ? config.tools.allowParallelCalls : undefined,
      tool_choice: config.toolChoice === "auto" ? "auto" : config.toolChoice === "required" ? "required" : config.toolChoice === "none" ? "none" :
        config.toolChoice ? {type: "function", function: {name: config.toolChoice}} : undefined,
    });

    const durationMs = Date.now() - start;

    const inputTokens = response.usage?.prompt_tokens;
    const outputTokens = response.usage?.completion_tokens;

    const message = response.choices[0].message;

    const toolCalls: MaybeUndefined<LlmToolCall[]> = message.tool_calls?.map(call =>
      (
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
      ));

    return {
      ...generateAssistantMessage(message.content, toolCalls),
      meta: {
        model,
        _provider,
        durationMs,
        inputTokens,
        outputTokens,
      }
    };
  }

  async* generateResponseStream(model: string, messages: LlmMessage[], config: Omit<LlmGenerationConfig, "tools" | "toolChoice"> = {}): AsyncGenerator<LlmStreamResponseChunk, LlmStreamResponse, unknown> {
    const start = Date.now();

    const response = await this.client.chat.completions.create({
      model,
      messages: await convertLlmMessagesToGroqMessages(messages),
      temperature: config.temperature || this.defaultTemperature,
      response_format: config.json ? {type: "json_object"} : {type: "text"},
      max_tokens: config.maxTokens || undefined,
      stream: true,
    });

    let content = "";
    for await (const chunk of response) {
      const contentChunk = firstEntry(chunk.choices)?.delta?.content;
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
      role: "assistant",
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