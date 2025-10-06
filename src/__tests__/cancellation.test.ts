import { JorEl } from "../jorel";

// Mock the test provider to simulate long-running operations
jest.mock("../__mocks__/test-provider", () => {
  return {
    TestProvider: class TestProvider {
      name = "test";

      async generateResponse(model: string, messages: any[], config: any = {}) {
        // Simulate a long-running operation
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve({
              id: "test-id",
              role: "assistant",
              content: "Test response",
              createdAt: Date.now(),
              meta: {
                model,
                provider: "test",
                durationMs: 1000,
                inputTokens: 10,
                outputTokens: 5,
              },
            });
          }, 2000); // 2 second delay

          // Listen for abort signal
          if (config.abortSignal) {
            config.abortSignal.addEventListener("abort", () => {
              clearTimeout(timeout);
              reject(new Error("Request was aborted"));
            });
          }
        });
      }

      async *generateResponseStream(model: string, messages: any[], config: any = {}) {
        // Simulate streaming chunks
        for (let i = 0; i < 10; i++) {
          // Check for abort signal
          if (config.abortSignal?.aborted) {
            throw new Error("Request was aborted");
          }

          yield {
            type: "chunk",
            content: `Chunk ${i + 1} `,
          };

          // Simulate delay between chunks
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        yield {
          type: "response",
          role: "assistant",
          content: "Complete response",
          meta: {
            model,
            provider: "test",
            durationMs: 5000,
            inputTokens: 10,
            outputTokens: 20,
          },
        };
      }

      async createEmbedding(model: string, text: string, abortSignal?: AbortSignal) {
        return new Promise<number[]>((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve([0.1, 0.2, 0.3, 0.4, 0.5]);
          }, 1000);

          if (abortSignal) {
            abortSignal.addEventListener("abort", () => {
              clearTimeout(timeout);
              reject(new Error("Request was aborted"));
            });
          }
        });
      }

      async getAvailableModels() {
        return ["test-model"];
      }
    },
  };
});

describe("Cancellation Support", () => {
  let jorel: JorEl;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TestProvider } = require("../__mocks__/test-provider");
    jorel = new JorEl();
    jorel.providers.registerCustom("test", new TestProvider());
    jorel.models.register({ model: "test-model", provider: "test", setAsDefault: true });
    // Register embedding model for embedding tests
    jorel.models.embeddings.register({ model: "test-model", provider: "test", dimensions: 5, setAsDefault: true });
  });

  describe("Text Generation Cancellation", () => {
    it("should cancel text generation when abort signal is triggered", async () => {
      const controller = new AbortController();

      // Cancel after 1 second
      setTimeout(() => controller.abort(), 1000);

      await expect(
        jorel.text("Test prompt", {
          model: "test-model",
          abortSignal: controller.signal,
        }),
      ).rejects.toThrow("Request was aborted");
    });

    it("should complete text generation when not cancelled", async () => {
      const controller = new AbortController();

      const result = await jorel.text("Test prompt", {
        model: "test-model",
        abortSignal: controller.signal,
      });

      expect(result).toBe("Test response");
    });
  });

  describe("Stream Cancellation", () => {
    it("should cancel streaming when abort signal is triggered", async () => {
      const controller = new AbortController();

      // Cancel after 1.5 seconds (should get a few chunks)
      setTimeout(() => controller.abort(), 1500);

      const chunks: string[] = [];

      await expect(async () => {
        const stream = jorel.stream("Test prompt", {
          model: "test-model",
          abortSignal: controller.signal,
        });

        for await (const chunk of stream) {
          chunks.push(chunk);
        }
      }).rejects.toThrow("Request was aborted");

      // Should have received some chunks before cancellation
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.length).toBeLessThan(10);
    });

    it("should complete streaming when not cancelled", async () => {
      const controller = new AbortController();

      const chunks: string[] = [];
      const stream = jorel.stream("Test prompt", {
        model: "test-model",
        abortSignal: controller.signal,
      });

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(10);
      expect(chunks.join("")).toContain("Chunk");
    }, 10000); // Increase timeout to 10 seconds
  });

  describe("Embedding Cancellation", () => {
    it("should cancel embedding generation when abort signal is triggered", async () => {
      const controller = new AbortController();

      // Cancel immediately
      setTimeout(() => controller.abort(), 100);

      await expect(
        jorel.embed("Test text", {
          model: "test-model",
          abortSignal: controller.signal,
        }),
      ).rejects.toThrow("Request was aborted");
    });

    it("should complete embedding generation when not cancelled", async () => {
      const controller = new AbortController();

      const result = await jorel.embed("Test text", {
        model: "test-model",
        abortSignal: controller.signal,
      });

      expect(result).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    });
  });

  describe("JSON Generation Cancellation", () => {
    it("should cancel JSON generation when abort signal is triggered", async () => {
      const controller = new AbortController();

      // Cancel after 1 second
      setTimeout(() => controller.abort(), 1000);

      await expect(
        jorel.json("Generate a JSON object", {
          model: "test-model",
          abortSignal: controller.signal,
        }),
      ).rejects.toThrow("Request was aborted");
    });
  });
});
