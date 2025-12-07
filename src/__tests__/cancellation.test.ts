import { TestProvider } from "../__mocks__/test-provider";
import { JorEl } from "../jorel";
import { LlmStreamEvent } from "../providers";

describe("Stream Cancellation and Error Handling", () => {
  describe("Stream Cancellation", () => {
    it("should emit response with stopReason 'userCancelled' when aborted during streaming", async () => {
      const jorel = new JorEl();
      const provider = new TestProvider({
        defaultStreamResponse: ["Chunk1 ", "Chunk2 ", "Chunk3 ", "Chunk4 ", "Chunk5 "],
        simulateDelay: 100,
      });
      jorel.providers.registerCustom("test", provider);
      jorel.models.register({ model: "test-model", provider: "test", setAsDefault: true });

      const controller = new AbortController();
      const events: LlmStreamEvent[] = [];

      // Abort after 250ms (should get ~2 chunks)
      setTimeout(() => controller.abort(), 250);

      const stream = jorel.streamWithMeta("Test prompt", {
        model: "test-model",
        abortSignal: controller.signal,
      });

      for await (const event of stream) {
        events.push(event);
      }

      // Should have received some chunks
      const chunks = events.filter((e) => e.type === "chunk");
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.length).toBeLessThan(5);

      // Should have a response event with userCancelled
      const responseEvent = events.find((e) => e.type === "response");
      expect(responseEvent).toBeDefined();
      expect(responseEvent?.type === "response" && responseEvent.stopReason).toBe("userCancelled");

      // Should have a messages event with userCancelled
      const messagesEvent = events.find((e) => e.type === "messages");
      expect(messagesEvent).toBeDefined();
      expect(messagesEvent?.type === "messages" && messagesEvent.stopReason).toBe("userCancelled");

      // Partial content should be preserved
      if (responseEvent?.type === "response") {
        expect(responseEvent.content?.length ?? 0).toBeGreaterThan(0);
      }
    });

    it("should preserve accumulated content when cancelled", async () => {
      const jorel = new JorEl();
      const provider = new TestProvider({
        defaultStreamResponse: ["Hello ", "World ", "How ", "Are ", "You"],
        simulateDelay: 50,
      });
      jorel.providers.registerCustom("test", provider);
      jorel.models.register({ model: "test-model", provider: "test", setAsDefault: true });

      const controller = new AbortController();
      const collectedChunks: string[] = [];

      // Abort after 150ms (should get ~3 chunks)
      setTimeout(() => controller.abort(), 150);

      const stream = jorel.streamWithMeta("Test prompt", {
        model: "test-model",
        abortSignal: controller.signal,
      });

      let finalContent = "";
      for await (const event of stream) {
        if (event.type === "chunk") {
          collectedChunks.push(event.content);
        }
        if (event.type === "response") {
          finalContent = event.content ?? "";
        }
      }

      // The final content should match the accumulated chunks
      expect(finalContent).toBe(collectedChunks.join(""));
      expect(finalContent.length).toBeGreaterThan(0);
    });

    it("should complete normally when not cancelled", async () => {
      const jorel = new JorEl();
      const provider = new TestProvider({
        defaultStreamResponse: ["Hello ", "World"],
        simulateDelay: 10,
      });
      jorel.providers.registerCustom("test", provider);
      jorel.models.register({ model: "test-model", provider: "test", setAsDefault: true });

      const events: LlmStreamEvent[] = [];
      const stream = jorel.streamWithMeta("Test prompt", {
        model: "test-model",
      });

      for await (const event of stream) {
        events.push(event);
      }

      // Should have all chunks
      const chunks = events.filter((e) => e.type === "chunk");
      expect(chunks.length).toBe(2);

      // Should have response with 'completed'
      const responseEvent = events.find((e) => e.type === "response");
      expect(responseEvent?.type === "response" && responseEvent.stopReason).toBe("completed");
      expect(responseEvent?.type === "response" && responseEvent.content).toBe("Hello World");

      // Should have messages with 'completed'
      const messagesEvent = events.find((e) => e.type === "messages");
      expect(messagesEvent?.type === "messages" && messagesEvent.stopReason).toBe("completed");
    });
  });

  describe("Stream Error Handling", () => {
    it("should emit response with stopReason 'generationError' when provider errors", async () => {
      const jorel = new JorEl();
      const provider = new TestProvider({
        defaultStreamResponse: ["Chunk1 ", "Chunk2 ", "Chunk3 ", "Chunk4 ", "Chunk5 "],
        simulateDelay: 10,
        errorAfterChunks: 2,
        errorMessage: "Network connection lost",
      });
      jorel.providers.registerCustom("test", provider);
      jorel.models.register({ model: "test-model", provider: "test", setAsDefault: true });

      const events: LlmStreamEvent[] = [];
      const stream = jorel.streamWithMeta("Test prompt", {
        model: "test-model",
      });

      for await (const event of stream) {
        events.push(event);
      }

      // Should have received chunks before the error
      const chunks = events.filter((e) => e.type === "chunk");
      expect(chunks.length).toBe(2);

      // Should have a response event with generationError
      const responseEvent = events.find((e) => e.type === "response");
      expect(responseEvent).toBeDefined();
      expect(responseEvent?.type === "response" && responseEvent.stopReason).toBe("generationError");
      expect(responseEvent?.type === "response" && responseEvent.error).toEqual({
        message: "Network connection lost",
        type: "unknown",
      });

      // Partial content should be preserved
      expect(responseEvent?.type === "response" && responseEvent.content).toBe("Chunk1 Chunk2 ");
    });

    it("should include error message in messages event", async () => {
      const jorel = new JorEl();
      const provider = new TestProvider({
        defaultStreamResponse: ["A", "B", "C"],
        simulateDelay: 10,
        errorAfterChunks: 1,
        errorMessage: "API rate limit exceeded",
      });
      jorel.providers.registerCustom("test", provider);
      jorel.models.register({ model: "test-model", provider: "test", setAsDefault: true });

      const events: LlmStreamEvent[] = [];
      const stream = jorel.streamWithMeta("Test prompt", {
        model: "test-model",
      });

      for await (const event of stream) {
        events.push(event);
      }

      // Should have messages event with error
      const messagesEvent = events.find((e) => e.type === "messages");
      expect(messagesEvent).toBeDefined();
      expect(messagesEvent?.type === "messages" && messagesEvent.stopReason).toBe("generationError");
      expect(messagesEvent?.type === "messages" && messagesEvent.error).toEqual({
        message: "API rate limit exceeded",
        type: "unknown",
      });
    });

    it("should not include error field when completed normally", async () => {
      const jorel = new JorEl();
      const provider = new TestProvider({
        defaultStreamResponse: ["Success"],
        simulateDelay: 10,
      });
      jorel.providers.registerCustom("test", provider);
      jorel.models.register({ model: "test-model", provider: "test", setAsDefault: true });

      const events: LlmStreamEvent[] = [];
      const stream = jorel.streamWithMeta("Test prompt", {
        model: "test-model",
      });

      for await (const event of stream) {
        events.push(event);
      }

      const responseEvent = events.find((e) => e.type === "response");
      expect(responseEvent?.type === "response" && responseEvent.error).toBeUndefined();

      const messagesEvent = events.find((e) => e.type === "messages");
      expect(messagesEvent?.type === "messages" && messagesEvent.error).toBeUndefined();
    });

    it("should not include error field when cancelled (intentional)", async () => {
      const jorel = new JorEl();
      const provider = new TestProvider({
        defaultStreamResponse: ["A", "B", "C"],
        simulateDelay: 50,
      });
      jorel.providers.registerCustom("test", provider);
      jorel.models.register({ model: "test-model", provider: "test", setAsDefault: true });

      const controller = new AbortController();

      // Abort quickly
      setTimeout(() => controller.abort(), 75);

      const events: LlmStreamEvent[] = [];
      const stream = jorel.streamWithMeta("Test prompt", {
        model: "test-model",
        abortSignal: controller.signal,
      });

      for await (const event of stream) {
        events.push(event);
      }

      // Cancellation should not have an error field (it's intentional)
      const responseEvent = events.find((e) => e.type === "response");
      expect(responseEvent?.type === "response" && responseEvent.stopReason).toBe("userCancelled");
      expect(responseEvent?.type === "response" && responseEvent.error).toBeUndefined();
    });
  });

  describe("Simple stream() method", () => {
    it("should yield content even when cancelled", async () => {
      const jorel = new JorEl();
      const provider = new TestProvider({
        defaultStreamResponse: ["One ", "Two ", "Three ", "Four ", "Five "],
        simulateDelay: 50,
      });
      jorel.providers.registerCustom("test", provider);
      jorel.models.register({ model: "test-model", provider: "test", setAsDefault: true });

      const controller = new AbortController();
      const chunks: string[] = [];

      // Abort after 150ms
      setTimeout(() => controller.abort(), 150);

      const stream = jorel.stream("Test prompt", {
        model: "test-model",
        abortSignal: controller.signal,
      });

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      // Should have received some chunks before cancellation
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.length).toBeLessThan(5);
    });
  });

  describe("Embedding Cancellation", () => {
    it("should throw error when embedding is aborted", async () => {
      const jorel = new JorEl();
      const provider = new TestProvider({
        simulateDelay: 500,
      });
      jorel.providers.registerCustom("test", provider);
      jorel.models.embeddings.register({ model: "test-model", provider: "test", dimensions: 10, setAsDefault: true });

      const controller = new AbortController();

      // Cancel after 100ms
      setTimeout(() => controller.abort(), 100);

      // Embedding cancellation still throws (non-streaming operation)
      await expect(
        jorel.embed("Test text", {
          model: "test-model",
          abortSignal: controller.signal,
        }),
      ).rejects.toThrow();
    });
  });
});
