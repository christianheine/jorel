import {
  LlmMessage,
  generateAssistantMessage,
  LlmCoreProvider,
  LlmGenerationConfig,
  LlmResponse,
  LlmStreamResponse,
  LlmStreamResponseChunk,
  LlmStreamResponseWithToolCalls,
} from "../providers";

export interface TestProviderConfig {
  name?: string;
  defaultResponse?: string;
  defaultStreamResponse?: string[];
  simulateDelay?: number;
  failOnModels?: string[];
}

export class TestProvider implements LlmCoreProvider {
  public readonly name: string;
  private defaultResponse: string;
  private defaultStreamResponse: string[];
  private simulateDelay: number;
  private failOnModels: string[];

  constructor(config: TestProviderConfig = {}) {
    this.name = config.name || "test-provider";
    this.defaultResponse = config.defaultResponse || "This is a test response";
    this.defaultStreamResponse = config.defaultStreamResponse || ["This ", "is ", "a ", "test ", "response"];
    this.simulateDelay = config.simulateDelay || 0;
    this.failOnModels = config.failOnModels || [];
  }

  private async delay() {
    if (this.simulateDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.simulateDelay));
    }
  }

  async generateResponse(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): Promise<LlmResponse> {
    await this.delay();

    if (this.failOnModels.includes(model)) {
      throw new Error(`Model ${model} is configured to fail`);
    }

    // If tools are provided and toolChoice is not "none", return a tool call
    if (config.tools && config.toolChoice !== "none") {
      const tool = config.tools.tools[0]; // Use first available tool
      if (tool) {
        return {
          ...generateAssistantMessage(null, [
            {
              id: "test-tool-call",
              request: {
                id: "test-function-call",
                function: {
                  name: tool.name,
                  arguments: { test: "value" },
                },
              },
              approvalState: tool.requiresConfirmation ? "requiresApproval" : "noApprovalRequired",
              executionState: "pending",
              result: null,
              error: null,
            },
          ]),
          meta: {
            model,
            provider: this.name,
            temperature: config.temperature ?? undefined,
            durationMs: this.simulateDelay,
            inputTokens: 10,
            outputTokens: 10,
          },
        };
      }
    }

    return {
      ...generateAssistantMessage(this.defaultResponse),
      meta: {
        model,
        provider: this.name,
        temperature: config.temperature ?? undefined,
        durationMs: this.simulateDelay,
        inputTokens: 10,
        outputTokens: 10,
      },
    };
  }

  async *generateResponseStream(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): AsyncGenerator<LlmStreamResponseChunk | LlmStreamResponse | LlmStreamResponseWithToolCalls, void, unknown> {
    if (this.failOnModels.includes(model)) {
      throw new Error(`Model ${model} is configured to fail`);
    }

    for (const chunk of this.defaultStreamResponse) {
      await this.delay();
      yield { type: "chunk", content: chunk };
    }

    yield {
      type: "response",
      role: "assistant",
      content: this.defaultStreamResponse.join(""),
      meta: {
        model,
        provider: this.name,
        temperature: config.temperature ?? undefined,
        durationMs: this.simulateDelay * this.defaultStreamResponse.length,
        inputTokens: 10,
        outputTokens: 10,
      },
    };
  }

  async getAvailableModels(): Promise<string[]> {
    await this.delay();
    return ["test-model-1", "test-model-2", "test-model-3"];
  }

  async createEmbedding(model: string, text: string): Promise<number[]> {
    await this.delay();

    if (this.failOnModels.includes(model)) {
      throw new Error(`Model ${model} is configured to fail`);
    }

    // Return a deterministic embedding based on input text length
    return Array(10)
      .fill(0)
      .map((_, i) => (text.length + i) / 100);
  }
}
