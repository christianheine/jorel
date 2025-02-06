import { JorEl } from "../..";
import { TestProvider } from "../../__mocks__/test-provider";

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
});
