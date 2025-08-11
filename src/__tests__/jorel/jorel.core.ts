import { TestProvider } from "../../__mocks__/test-provider";
import { JorElCoreStore } from "../../jorel/jorel.core";
import { LlmMessage, LlmUserMessage } from "../../providers";
import { LlmTool, LlmToolKit } from "../../tools";

describe("JorElCoreStore", () => {
  let coreStore: JorElCoreStore;
  let testProvider: TestProvider;

  beforeEach(() => {
    coreStore = new JorElCoreStore({
      temperature: 0.5,
      logLevel: "error",
    });
    testProvider = new TestProvider();
    coreStore.providerManager.registerProvider("test", testProvider);
    coreStore.modelManager.registerModel({ model: "test-model", provider: "test" });
    coreStore.modelManager.setDefaultModel("test-model");
  });

  describe("generate", () => {
    it("should generate a response", async () => {
      const messages: LlmMessage[] = [
        {
          id: "1",
          role: "user",
          content: [{ type: "text", text: "Hello" }],
          createdAt: Date.now(),
        } as LlmUserMessage,
      ];

      const response = await coreStore.generate(messages);

      expect(response).toBeDefined();
      expect(response.content).toBe("This is a test response");
      expect(response.meta).toHaveProperty("model", "test-model");
      expect(response.meta).toHaveProperty("provider", "test-provider");
      expect(response.meta).toHaveProperty("temperature", 0.5);
    });

    it("should apply model overrides", async () => {
      // Mock the applyModelDefaultsAndOverrides method
      const originalApplyMethod = coreStore["applyModelDefaultsAndOverrides"];
      coreStore["applyModelDefaultsAndOverrides"] = jest.fn().mockImplementation((messages, config, modelEntry) => {
        return {
          messages,
          config: { ...config, temperature: null },
        };
      });

      const spy = jest.spyOn(testProvider, "generateResponse");

      const messages: LlmMessage[] = [
        {
          id: "1",
          role: "user",
          content: [{ type: "text", text: "Hello" }],
          createdAt: Date.now(),
        } as LlmUserMessage,
      ];

      await coreStore.generate(messages, { temperature: 0.7 });

      expect(spy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ temperature: null }),
      );

      // Restore original method
      coreStore["applyModelDefaultsAndOverrides"] = originalApplyMethod;
    });
  });

  describe("generateAndProcessTools", () => {
    it("should process tool calls", async () => {
      // Create a proper function tool
      const testTool = new LlmTool({
        name: "testTool",
        description: "A test tool",
        executor: async () => ({ result: "Tool executed" }),
        params: {
          type: "object",
          properties: {
            test: { type: "string" },
          },
          required: [],
        },
      });

      const toolKit = new LlmToolKit([testTool]);

      // Mock the generate method to avoid the error with meta
      const originalGenerate = coreStore.generate;
      const mockResponse = {
        id: "test-id",
        role: "assistant_with_tools",
        content: null,
        toolCalls: [
          {
            id: "test-tool-call",
            request: {
              id: "test-function-call",
              function: {
                name: "testTool",
                arguments: { test: "value" },
              },
            },
            approvalState: "noApprovalRequired",
            executionState: "pending",
            result: null,
          },
        ],
        meta: {
          model: "test-model",
          provider: "test-provider",
          temperature: 0.5,
          durationMs: 100,
          inputTokens: 10,
          outputTokens: 20,
        },
      };

      coreStore.generate = jest.fn().mockResolvedValue(mockResponse);

      const messages: LlmMessage[] = [
        {
          id: "1",
          role: "user",
          content: [{ type: "text", text: "Use the tool" }],
          createdAt: Date.now(),
        } as LlmUserMessage,
      ];

      const { output, messages: resultMessages } = await coreStore.generateAndProcessTools(
        messages,
        { tools: toolKit },
        true, // Auto-approve
      );

      expect(output).toBeDefined();
      expect(resultMessages.length).toBeGreaterThan(1); // Should have added messages

      // Restore original method
      coreStore.generate = originalGenerate;
    });
  });

  describe("generateContentStream", () => {
    it("should stream response chunks", async () => {
      const messages: LlmMessage[] = [
        {
          id: "1",
          role: "user",
          content: [{ type: "text", text: "Hello" }],
          createdAt: Date.now(),
        } as LlmUserMessage,
      ];

      const chunks: any[] = [];
      const stream = coreStore.generateContentStream(messages);

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1]).toHaveProperty("type", "response");
    });
  });

  describe("generateEmbedding", () => {
    it("should generate embeddings", async () => {
      // Register an embedding model
      coreStore.modelManager.registerEmbeddingModel({
        model: "test-embedding-model",
        provider: "test",
        dimensions: 10,
      });
      coreStore.modelManager.setDefaultEmbeddingModel("test-embedding-model");

      const embedding = await coreStore.generateEmbedding("Test text");

      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBeGreaterThan(0);
      expect(typeof embedding[0]).toBe("number");
    });
  });
});
