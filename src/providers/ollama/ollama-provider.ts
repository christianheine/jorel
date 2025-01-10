import ollama, {Tool} from "ollama";

import {generateAssistantMessage, generateRandomId, LlmCoreProvider, LlmGenerationConfig, LlmMessage, LlmResponse, LlmStreamResponse, LlmStreamResponseChunk, LlmToolCall, MaybeUndefined} from "../../shared";
import {convertLlmMessagesToOllamaMessages} from "./convert-llm-message";

export interface OllamaConfig {
  apiKey?: string;
  apiUrl?: string;
  defaultTemperature?: number;
}

const _provider = "OllamaProvider";

/** Provides access to local Ollama server */
export class OllamaProvider implements LlmCoreProvider {
  public defaultTemperature;

  constructor({defaultTemperature}: OllamaConfig = {}) {
    this.defaultTemperature = defaultTemperature ?? 0;
  }

  async generateResponse(model: string, messages: LlmMessage[], config: LlmGenerationConfig = {}): Promise<LlmResponse > {
    const start = Date.now();

    const response = await ollama.chat({
      model,
      messages: await convertLlmMessagesToOllamaMessages(messages),
      format: config.json ? "json" : undefined,
      tools: config.tools?.llmFunctions.map((f): Tool => ({
        type: "function",
        function: {
          name: f.function.name,
          description: f.function.description,
          parameters: {
            type: f.function.parameters?.type ?? "object",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            properties: f.function.parameters?.properties ?? {} as Record<string, any>,
            required: f.function.parameters?.required ?? [],
          }
        },
      })),
      options: {
        temperature: config.temperature || this.defaultTemperature,
      }
    });

    const durationMs = Date.now() - start;

    const inputTokens = response.prompt_eval_count; // Somewhat undocumented at the moment
    const outputTokens = response.eval_count; // Somewhat undocumented at the moment

    const message = response.message;

    const toolCalls: MaybeUndefined<LlmToolCall[]> = message.tool_calls?.map(call =>
      (
        {
          request: {
            id: generateRandomId(),
            function: {
              name: call.function.name,
              arguments: call.function.arguments,
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

  async* generateResponseStream(
    model: string,
    messages: LlmMessage[],
    config: Omit<LlmGenerationConfig, "tools" | "toolChoice"> = {}
  ): AsyncGenerator<LlmStreamResponseChunk, LlmStreamResponse, unknown> {
    const start = Date.now();

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
    const {models} = await ollama.ps();
    return models.map(model => model.name);
  }
}
