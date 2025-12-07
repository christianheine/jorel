import {
  generateAssistantMessage,
  LlmCoreProvider,
  LlmGenerationConfig,
  LLmGenerationStopReason,
  LlmMessage,
  LlmResponse,
  LlmStreamProviderResponseChunkEvent,
  LlmStreamResponse,
  LlmStreamResponseWithToolCalls,
} from "../providers";
import { generateUniqueId } from "../shared";

export interface TestProviderConfig {
  name?: string;
  defaultResponse?: string;
  defaultStreamResponse?: string[];
  simulateDelay?: number;
  failOnModels?: string[];
  /** If set, will simulate an error after this many chunks */
  errorAfterChunks?: number;
  /** The error message to use when simulating errors */
  errorMessage?: string;
}

export class TestProvider implements LlmCoreProvider {
  public readonly name: string;
  private defaultResponse: string;
  private defaultStreamResponse: string[];
  private simulateDelay: number;
  private failOnModels: string[];
  private errorAfterChunks?: number;
  private errorMessage: string;

  constructor(config: TestProviderConfig = {}) {
    this.name = config.name || "test-provider";
    this.defaultResponse = config.defaultResponse || "This is a test response";
    this.defaultStreamResponse = config.defaultStreamResponse || ["This ", "is ", "a ", "test ", "response"];
    this.simulateDelay = config.simulateDelay || 0;
    this.failOnModels = config.failOnModels || [];
    this.errorAfterChunks = config.errorAfterChunks;
    this.errorMessage = config.errorMessage || "Simulated error";
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
          ...generateAssistantMessage(null, null, [
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
      ...generateAssistantMessage(this.defaultResponse, null),
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
  ): AsyncGenerator<
    LlmStreamProviderResponseChunkEvent | LlmStreamResponse | LlmStreamResponseWithToolCalls,
    void,
    unknown
  > {
    let content = "";
    let caughtError: Error | null = null;
    let chunksEmitted = 0;

    try {
      for (const chunk of this.defaultStreamResponse) {
        // Check for abort signal
        if (config.abortSignal?.aborted) {
          break;
        }

        // Simulate error after N chunks if configured
        if (this.errorAfterChunks !== undefined && chunksEmitted >= this.errorAfterChunks) {
          throw new Error(this.errorMessage);
        }

        // Check for model failure
        if (this.failOnModels.includes(model)) {
          throw new Error(`Model ${model} is configured to fail`);
        }

        await this.delay();
        content += chunk;
        chunksEmitted++;
        yield { type: "chunk", content: chunk, chunkId: generateUniqueId() };
      }
    } catch (error: unknown) {
      caughtError = error instanceof Error ? error : new Error(String(error));
    }

    // Determine stop reason and error
    let stopReason: LLmGenerationStopReason = "completed";
    let errorMessage: string | undefined;

    if (config.abortSignal?.aborted) {
      stopReason = "userCancelled";
    } else if (caughtError) {
      stopReason = "generationError";
      errorMessage = caughtError.message;
      // Log the error
      config.logger?.error("TestProvider", `Stream error: ${errorMessage}`);
    }

    yield {
      type: "response",
      role: "assistant",
      content,
      reasoningContent: null,
      meta: {
        model,
        provider: this.name,
        temperature: config.temperature ?? undefined,
        durationMs: this.simulateDelay * chunksEmitted,
        inputTokens: 10,
        outputTokens: chunksEmitted * 2,
      },
      stopReason,
      error:
        stopReason === "generationError" ? { message: errorMessage || "Unknown error", type: "unknown" } : undefined,
    };
  }

  async getAvailableModels(): Promise<string[]> {
    await this.delay();
    return ["test-model-1", "test-model-2", "test-model-3"];
  }

  async createEmbedding(model: string, text: string, abortSignal?: AbortSignal): Promise<number[]> {
    // Check for pre-aborted signal
    if (abortSignal?.aborted) {
      throw new Error("Request was aborted");
    }

    // Create a promise that resolves after delay but can be aborted
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(resolve, this.simulateDelay);

      if (abortSignal) {
        abortSignal.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(new Error("Request was aborted"));
        });
      }
    });

    if (this.failOnModels.includes(model)) {
      throw new Error(`Model ${model} is configured to fail`);
    }

    // Return a deterministic embedding based on input text length
    return Array(10)
      .fill(0)
      .map((_, i) => (text.length + i) / 100);
  }
}
