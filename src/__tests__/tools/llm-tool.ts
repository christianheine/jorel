import { z } from "zod";
import { LlmTool } from "../../tools/llm-tool";

describe("LlmTool", () => {
  describe("constructor", () => {
    it("should create a tool with minimal configuration", () => {
      const tool = new LlmTool({
        name: "test-tool",
        description: "A test tool",
      });

      expect(tool.name).toBe("test-tool");
      expect(tool.description).toBe("A test tool");
      expect(tool.requiresConfirmation).toBe(false);
      expect(tool.type).toBe("functionDefinition");
    });

    it("should create a tool with full configuration", () => {
      const executor = jest.fn();
      const tool = new LlmTool({
        name: "full-tool",
        description: "A fully configured tool",
        requiresConfirmation: true,
        executor,
        params: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
          required: ["name"],
        },
      });

      expect(tool.requiresConfirmation).toBe(true);
      expect(tool.type).toBe("function");
    });

    it("should accept Zod schema for params", () => {
      const tool = new LlmTool({
        name: "zod-tool",
        description: "Tool with Zod schema",
        params: z.object({
          name: z.string(),
          age: z.number(),
        }),
      });

      const llmFunction = tool.asLLmFunction;
      expect(llmFunction.function.parameters).toEqual({
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name", "age"],
      });
    });
  });

  describe("type", () => {
    it("should return 'transfer' for transfer executor", () => {
      const tool = new LlmTool({
        name: "transfer-tool",
        description: "Transfer tool",
        executor: "transfer",
      });

      expect(tool.type).toBe("transfer");
    });

    it("should return 'subTask' for subTask executor", () => {
      const tool = new LlmTool({
        name: "subtask-tool",
        description: "SubTask tool",
        executor: "subTask",
      });

      expect(tool.type).toBe("subTask");
    });

    it("should return 'function' for custom executor", () => {
      const tool = new LlmTool({
        name: "function-tool",
        description: "Function tool",
        executor: jest.fn(),
      });

      expect(tool.type).toBe("function");
    });
  });

  describe("asLLmFunction", () => {
    it("should return correct function definition", () => {
      const tool = new LlmTool({
        name: "test-function",
        description: "Test function",
        params: {
          type: "object",
          properties: {
            input: { type: "string" },
          },
          required: ["input"],
        },
      });

      const functionDef = tool.asLLmFunction;
      expect(functionDef).toEqual({
        type: "function",
        function: {
          name: "test-function",
          description: "Test function",
          parameters: {
            type: "object",
            properties: {
              input: { type: "string" },
            },
            required: ["input"],
            additionalProperties: false,
          },
        },
      });
    });
  });

  describe("execute", () => {
    it("should execute function with provided arguments and context", async () => {
      const executor = jest.fn().mockResolvedValue({ result: "success" });
      const tool = new LlmTool({
        name: "executable-tool",
        description: "Tool that can be executed",
        executor,
      });

      const args = { input: "test" };
      const context = { userId: "123" };
      const secureContext = { apiKey: "secret" };

      await tool.execute(args, { context, secureContext });

      expect(executor).toHaveBeenCalledWith(args, context, secureContext);
    });

    it("should throw error when executor is not defined", async () => {
      const tool = new LlmTool({
        name: "no-executor-tool",
        description: "Tool without executor",
      });

      await expect(tool.execute({})).rejects.toThrow("Executor not defined for tool: no-executor-tool");
    });

    it("should throw error when trying to execute transfer tool", async () => {
      const tool = new LlmTool({
        name: "transfer-tool",
        description: "Transfer tool",
        executor: "transfer",
      });

      await expect(tool.execute({})).rejects.toThrow(
        'Cannot execute tool "transfer-tool". transfer tools cannot be executed directly.',
      );
    });

    it("should throw error when trying to execute subTask tool", async () => {
      const tool = new LlmTool({
        name: "subtask-tool",
        description: "SubTask tool",
        executor: "subTask",
      });

      await expect(tool.execute({})).rejects.toThrow(
        'Cannot execute tool "subtask-tool". subTask tools cannot be executed directly.',
      );
    });

    it("should pass context and secureContext to executor", async () => {
      const executor = jest.fn().mockResolvedValue({ result: "success" });
      const tool = new LlmTool({
        name: "context-tool",
        description: "Tool that uses context",
        executor,
      });

      const context = { userId: "123", sessionData: { key: "value" } };
      const secureContext = { apiKey: "secret", credentials: { token: "abc" } };

      await tool.execute({ input: "test" }, { context, secureContext });

      expect(executor).toHaveBeenCalledWith({ input: "test" }, context, secureContext);
    });
  });

  describe("parameter validation", () => {
    it("should set default values for parameters", () => {
      const tool = new LlmTool({
        name: "params-tool",
        description: "Tool with minimal params",
        params: {
          properties: {
            input: { type: "string" },
          },
        },
      });

      const functionDef = tool.asLLmFunction;
      expect(functionDef.function.parameters).toEqual({
        type: "object",
        properties: {
          input: { type: "string" },
        },
        required: [],
        additionalProperties: false,
      });
    });

    it("should handle array type parameters", () => {
      const tool = new LlmTool({
        name: "array-tool",
        description: "Tool with array params",
        params: {
          type: "array",
          items: {
            type: "string",
          },
        },
      });

      const functionDef = tool.asLLmFunction;
      expect(functionDef.function.parameters?.type).toBe("array");
      expect(functionDef.function.parameters?.items).toEqual({
        type: "string",
      });
    });

    it("should handle empty params", () => {
      const tool = new LlmTool({
        name: "empty-params-tool",
        description: "Tool with empty params",
        params: {},
      });

      const functionDef = tool.asLLmFunction;
      expect(functionDef.function.parameters).toEqual({
        type: "string",
        required: [],
        additionalProperties: false,
      });
    });

    it("should handle undefined params", () => {
      const tool = new LlmTool({
        name: "no-params-tool",
        description: "Tool without params",
      });

      const functionDef = tool.asLLmFunction;
      expect(functionDef.function.parameters).toBeUndefined();
    });
  });

  describe("type inference", () => {
    it("should correctly infer function type with custom executor", () => {
      const tool = new LlmTool({
        name: "function-type",
        description: "Function type tool",
        executor: () => Promise.resolve({}),
      });

      expect(tool.type).toBe("function");
    });

    it("should correctly infer functionDefinition type with no executor", () => {
      const tool = new LlmTool({
        name: "definition-type",
        description: "Definition type tool",
      });

      expect(tool.type).toBe("functionDefinition");
    });

    it("should correctly infer transfer type", () => {
      const tool = new LlmTool({
        name: "transfer-type",
        description: "Transfer type tool",
        executor: "transfer",
      });

      expect(tool.type).toBe("transfer");
    });

    it("should correctly infer subTask type", () => {
      const tool = new LlmTool({
        name: "subtask-type",
        description: "SubTask type tool",
        executor: "subTask",
      });

      expect(tool.type).toBe("subTask");
    });
  });
});
