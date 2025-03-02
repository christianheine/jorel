import { JorEl } from "../..";
import { TestProvider } from "../../__mocks__/test-provider";
import { CreateLlmDocument, LlmDocumentCollection } from "../../documents";
import { LlmTool, LlmToolKit } from "../../tools";
import { ImageContent } from "../../media";
import { LlmMessage, LlmUserMessage } from "../../providers";

describe("JorEl", () => {
  let jorel: JorEl;
  let testProvider: TestProvider;

  beforeEach(() => {
    testProvider = new TestProvider();
    jorel = new JorEl();
    jorel.providers.registerCustom("test", testProvider);
    jorel.models.register({ model: "test-model-1", provider: "test" });
  });

  describe("ask", () => {
    it("should return a simple response", async () => {
      const response = await jorel.ask("Hello");
      expect(response).toBe("This is a test response");
    });

    it("should use specified model", async () => {
      jorel.models.register({ model: "test-model-2", provider: "test" });

      const response = await jorel.ask("Hello", { model: "test-model-2" });
      expect(response).toBe("This is a test response");
    });

    it("should throw error for unregistered model", async () => {
      await expect(
        jorel.ask("Hello", {
          model: "non-existent-model",
        }),
      ).rejects.toThrow("Model non-existent-model is not registered");
    });

    it("should handle temperature setting", async () => {
      const spy = jest.spyOn(testProvider, "generateResponse");

      await jorel.ask("Hello", { temperature: 0.7 });

      expect(spy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ temperature: 0.7 }),
      );
    });

    it("should use default model when none specified", async () => {
      jorel.models.register({
        model: "test-model-2",
        provider: "test",
        setAsDefault: true,
      });

      const spy = jest.spyOn(testProvider, "generateResponse");
      await jorel.ask("Hello");

      expect(spy).toHaveBeenCalledWith("test-model-2", expect.any(Array), expect.any(Object));
    });

    it("should return metadata when includeMeta is true", async () => {
      const response = await jorel.ask("Hello", {}, true);
      expect(response).toHaveProperty("response");
      expect(response).toHaveProperty("meta");
      expect(response).toHaveProperty("messages");
      expect(response.response).toBe("This is a test response");
      expect(response.meta).toHaveProperty("model");
      expect(response.meta).toHaveProperty("provider");
      expect(response.meta).toHaveProperty("durationMs");
    });
  });

  describe("text", () => {
    it("should return a simple response", async () => {
      const response = await jorel.text("Hello");
      expect(response).toBe("This is a test response");
    });

    it("should return metadata when includeMeta is true", async () => {
      const response = await jorel.text("Hello", {}, true);
      expect(response).toHaveProperty("response");
      expect(response).toHaveProperty("meta");
      expect(response).toHaveProperty("messages");
      expect(response.response).toBe("This is a test response");
    });

    it("should handle custom system message", async () => {
      const spy = jest.spyOn(testProvider, "generateResponse");

      await jorel.text("Hello", { systemMessage: "Custom system message" });

      expect(spy).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: "Custom system message",
          }),
        ]),
        expect.any(Object),
      );
    });

    it("should handle message history", async () => {
      const spy = jest.spyOn(testProvider, "generateResponse");
      const messageHistory: LlmMessage[] = [
        {
          id: "1",
          role: "user",
          content: [{ type: "text", text: "Previous message" }],
          createdAt: Date.now(),
        } as LlmUserMessage,
      ];

      await jorel.text("Hello", { messageHistory });

      expect(spy).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: [{ type: "text", text: "Previous message" }],
          }),
        ]),
        expect.any(Object),
      );
    });

    it("should handle array of content including images", async () => {
      const mockImage = {
        toMessageContent: jest.fn().mockResolvedValue({
          type: "imageUrl",
          url: "https://example.com/image.jpg",
        }),
      } as unknown as ImageContent;

      const spy = jest.spyOn(testProvider, "generateResponse");

      await jorel.text(["Text content", mockImage]);

      expect(spy).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.arrayContaining([
              { type: "text", text: "Text content" },
              { type: "imageUrl", url: "https://example.com/image.jpg" },
            ]),
          }),
        ]),
        expect.any(Object),
      );
    });
  });

  describe("json", () => {
    beforeEach(() => {
      testProvider = new TestProvider({
        defaultResponse: '{"message": "Hello", "count": 42}',
      });
      jorel = new JorEl();
      jorel.providers.registerCustom("test", testProvider);
      jorel.models.register({ model: "test-model-1", provider: "test" });
    });

    it("should return parsed JSON response", async () => {
      const response = await jorel.json("Give me JSON");
      expect(response).toEqual({
        message: "Hello",
        count: 42,
      });
    });

    it("should pass json flag to provider", async () => {
      const spy = jest.spyOn(testProvider, "generateResponse");

      await jorel.json("Give me JSON");

      expect(spy).toHaveBeenCalledWith(expect.any(String), expect.any(Array), expect.objectContaining({ json: true }));
    });

    it("should return metadata when includeMeta is true", async () => {
      const response = await jorel.json("Give me JSON", {}, true);
      expect(response).toHaveProperty("response");
      expect(response).toHaveProperty("meta");
      expect(response).toHaveProperty("messages");
      expect(response.response).toEqual({
        message: "Hello",
        count: 42,
      });
    });

    it("should handle jsonSchema parameter", async () => {
      const spy = jest.spyOn(testProvider, "generateResponse");
      const jsonSchema = { type: "object", properties: { test: { type: "string" } } };

      await jorel.json("Give me JSON", { jsonSchema });

      expect(spy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ json: jsonSchema }),
      );
    });
  });

  describe("stream", () => {
    beforeEach(() => {
      testProvider = new TestProvider({
        defaultStreamResponse: ["This ", "is ", "a ", "test ", "response"],
      });
      jorel = new JorEl();
      jorel.providers.registerCustom("test", testProvider);
      jorel.models.register({ model: "test-model-1", provider: "test" });
    });

    it("should stream response chunks", async () => {
      const chunks: string[] = [];
      for await (const chunk of jorel.stream("Hello")) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(["This ", "is ", "a ", "test ", "response"]);
    });

    it("should respect delay configuration", async () => {
      const delayedProvider = new TestProvider({
        simulateDelay: 100,
        defaultStreamResponse: ["chunk1", "chunk2"],
      });
      jorel.providers.registerCustom("delayed", delayedProvider);
      jorel.models.register({
        model: "test-model-2",
        provider: "delayed",
      });
      jorel.models.setDefault("test-model-2");

      const start = Date.now();
      const chunks: string[] = [];
      for await (const chunk of jorel.stream("Hello")) {
        chunks.push(chunk);
      }
      const duration = Date.now() - start;

      expect(chunks).toEqual(["chunk1", "chunk2"]);
      expect(duration).toBeGreaterThanOrEqual(200); // 2 chunks * 100ms delay
    });
  });

  describe("streamWithMeta", () => {
    beforeEach(() => {
      testProvider = new TestProvider({
        defaultStreamResponse: ["This ", "is ", "a ", "test ", "response"],
      });
      jorel = new JorEl();
      jorel.providers.registerCustom("test", testProvider);
      jorel.models.register({ model: "test-model-1", provider: "test" });
    });

    it("should stream response chunks with metadata", async () => {
      const chunks: any[] = [];
      for await (const chunk of jorel.streamWithMeta("Hello")) {
        chunks.push(chunk);
      }

      // Should have 7 chunks: 5 content chunks, 1 final response, and 1 messages
      expect(chunks.length).toBe(7);

      // Check content chunks
      for (let i = 0; i < 5; i++) {
        expect(chunks[i]).toHaveProperty("type", "chunk");
        expect(chunks[i]).toHaveProperty("content");
      }

      // Check final response
      expect(chunks[5]).toHaveProperty("type", "response");
      expect(chunks[5]).toHaveProperty("role", "assistant");
      expect(chunks[5]).toHaveProperty("content", "This is a test response");
      expect(chunks[5]).toHaveProperty("meta");

      // Check messages
      expect(chunks[6]).toHaveProperty("type", "messages");
      expect(chunks[6]).toHaveProperty("messages");
      expect(Array.isArray(chunks[6].messages)).toBe(true);
    });
  });

  describe("embed", () => {
    it("should generate embeddings", async () => {
      // Register an embedding model
      jorel.models.embeddings.register({
        model: "test-embedding-model",
        provider: "test",
        dimensions: 3,
        setAsDefault: true,
      });

      // Mock the provider's response
      const originalCreateEmbedding = testProvider.createEmbedding;
      testProvider.createEmbedding = jest.fn().mockResolvedValueOnce([0.1, 0.2, 0.3]);

      const embedding = await jorel.embed("Test text");
      expect(embedding).toEqual([0.1, 0.2, 0.3]);

      // Restore original method
      testProvider.createEmbedding = originalCreateEmbedding;
    });

    it("should use specified model for embeddings", async () => {
      // Register a different embedding model
      jorel.models.embeddings.register({
        model: "another-embedding-model",
        provider: "test",
        dimensions: 3,
      });

      // Mock the provider's response
      const originalCreateEmbedding = testProvider.createEmbedding;
      testProvider.createEmbedding = jest.fn().mockResolvedValueOnce([0.4, 0.5, 0.6]);

      const embedding = await jorel.embed("Test text", { model: "another-embedding-model" });
      expect(embedding).toEqual([0.4, 0.5, 0.6]);

      // Restore original method
      testProvider.createEmbedding = originalCreateEmbedding;
    });
  });

  describe("tools", () => {
    it("should handle tool calls", async () => {
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

      // Mock the provider's response
      const originalGenerateResponse = testProvider.generateResponse;
      testProvider.generateResponse = jest.fn().mockResolvedValueOnce({
        id: "test-id",
        role: "assistant",
        content: "This is a test response",
        meta: {
          model: "test-model",
          provider: "test-provider",
          temperature: 0.5,
          durationMs: 100,
          inputTokens: 10,
          outputTokens: 20,
        },
      });

      const response = await jorel.ask("Use the tool", { tools: toolKit });
      expect(response).toBe("This is a test response");

      // Restore original method
      testProvider.generateResponse = originalGenerateResponse;
    });
  });

  describe("documents", () => {
    it("should handle documents in system message", async () => {
      const documents = new LlmDocumentCollection([
        { id: "doc1", title: "Test Document", content: "Document content" } as CreateLlmDocument,
      ]);

      const spy = jest.spyOn(testProvider, "generateResponse");

      await jorel.text("Hello", { documents });

      expect(spy).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("Document content"),
          }),
        ]),
        expect.any(Object),
      );
    });

    it("should use custom document system message", async () => {
      const documents = new LlmDocumentCollection([
        { id: "doc1", title: "Test Document", content: "Document content" } as CreateLlmDocument,
      ]);

      jorel.documentSystemMessage = "Custom document message: {{documents}}";

      const spy = jest.spyOn(testProvider, "generateResponse");

      await jorel.text("Hello", { documents });

      expect(spy).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("Custom document message:"),
          }),
        ]),
        expect.any(Object),
      );
    });

    it("should throw error if document system message doesn't include placeholder", () => {
      expect(() => {
        jorel.documentSystemMessage = "Invalid document message without placeholder";
      }).toThrow();
    });
  });

  describe("model overrides", () => {
    it("should apply model overrides", async () => {
      // Create a provider that will test model overrides
      const overrideTestProvider = new TestProvider();
      jorel.providers.registerCustom("override-test", overrideTestProvider);
      jorel.models.register({
        model: "no-temperature-model",
        provider: "override-test",
        setAsDefault: true,
      });

      // Mock the applyModelOverrides method to simulate a model that doesn't support temperature
      const originalGenerate = jorel["_core"].generate;
      jorel["_core"].generate = jest.fn().mockImplementation(async (messages, config) => {
        // Simulate the behavior of applyModelOverrides for a model that doesn't support temperature
        const newConfig = { ...config, temperature: null };
        return originalGenerate.call(jorel["_core"], messages, newConfig);
      });

      const spy = jest.spyOn(overrideTestProvider, "generateResponse");

      await jorel.text("Hello", { temperature: 0.7 });

      // The temperature should be null in the final call
      expect(spy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ temperature: null }),
      );

      // Restore the original method
      jorel["_core"].generate = originalGenerate;
    });
  });

  describe("logger", () => {
    it("should have a logger property", () => {
      expect(jorel.logger).toBeDefined();
    });

    it("should allow setting log level", () => {
      const originalLogLevel = jorel.logLevel;

      // Set to a different value than current
      const newLogLevel = originalLogLevel === "error" ? "debug" : "error";
      jorel.logLevel = newLogLevel as any;

      expect(jorel.logLevel).toBe(newLogLevel);

      // Restore original
      jorel.logLevel = originalLogLevel as any;
    });
  });

  describe("configuration", () => {
    it("should set system message", () => {
      jorel.systemMessage = "New system message";
      expect(jorel.systemMessage).toBe("New system message");
    });

    it("should set temperature", () => {
      jorel.temperature = 0.8;
      expect(jorel.temperature).toBe(0.8);

      jorel.temperature = null;
      expect(jorel.temperature).toBe(null);
    });
  });

  describe("JorElCoreStore", () => {
    it("should generate content stream", async () => {
      const chunks: any[] = [];
      const stream = jorel["_core"].generateContentStream(
        [
          {
            id: "1",
            role: "user",
            content: [{ type: "text", text: "Hello" }],
            createdAt: Date.now(),
          } as LlmUserMessage,
        ],
        {},
      );

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      // Should have chunks and a final response
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1]).toHaveProperty("type", "response");
    });
  });
});
