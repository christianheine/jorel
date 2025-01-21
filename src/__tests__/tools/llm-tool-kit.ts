import { LlmToolCall } from "../../providers";
import { LlmTool } from "../../tools/llm-tool";
import { LlmToolKit } from "../../tools/llm-tool-kit";

describe("LlmToolKit", () => {
  describe("constructor", () => {
    it("should initialize with tools array", () => {
      const tool = new LlmTool({ name: "test", description: "test tool" });
      const toolKit = new LlmToolKit([tool]);

      expect(toolKit.hasTools).toBe(true);
      expect(toolKit.tools.length).toBe(1);
      expect(toolKit.allowParallelCalls).toBe(true);
    });

    it("should initialize with tool configurations", () => {
      const toolConfig = { name: "test", description: "test tool" };
      const toolKit = new LlmToolKit([toolConfig]);

      expect(toolKit.tools[0]).toBeInstanceOf(LlmTool);
      expect(toolKit.tools[0].name).toBe("test");
    });

    it("should respect allowParallelCalls configuration", () => {
      const toolKit = new LlmToolKit([], { allowParallelCalls: false });
      expect(toolKit.allowParallelCalls).toBe(false);
    });
  });

  describe("tool management", () => {
    let toolKit: LlmToolKit;

    beforeEach(() => {
      toolKit = new LlmToolKit([]);
    });

    describe("registerTool", () => {
      it("should register a new tool", () => {
        const tool = new LlmTool({ name: "test", description: "test tool" });
        toolKit.registerTool(tool);
        expect(toolKit.tools.length).toBe(1);
        expect(toolKit.getTool("test")).toBe(tool);
      });

      it("should throw when registering duplicate tool name", () => {
        toolKit.registerTool({ name: "test", description: "test tool" });
        expect(() => toolKit.registerTool({ name: "test", description: "duplicate" })).toThrow(
          "A tool with name test already exists",
        );
      });
    });

    describe("registerTools", () => {
      it("should register multiple tools", () => {
        const tools = [
          { name: "tool1", description: "first tool" },
          { name: "tool2", description: "second tool" },
        ];
        toolKit.registerTools(tools);
        expect(toolKit.tools.length).toBe(2);
      });

      it("should throw if any tool name is duplicate", () => {
        toolKit.registerTool({ name: "test", description: "test tool" });
        expect(() =>
          toolKit.registerTools([
            { name: "new", description: "new tool" },
            { name: "test", description: "duplicate" },
          ]),
        ).toThrow("A tool with name test already exists");
      });
    });

    describe("unregisterTool", () => {
      it("should remove a registered tool", () => {
        toolKit.registerTool({ name: "test", description: "test tool" });
        toolKit.unregisterTool("test");
        expect(toolKit.tools.length).toBe(0);
      });

      it("should throw when unregistering non-existent tool", () => {
        expect(() => toolKit.unregisterTool("nonexistent")).toThrow("Tool not found: nonexistent");
      });

      it("should throw when unregistering transfer tool", () => {
        toolKit.registerTool({
          name: "transfer",
          description: "transfer tool",
          executor: "transfer",
        });
        expect(() => toolKit.unregisterTool("transfer")).toThrow(
          'Cannot unregister tool "transfer". transfer tools cannot be unregistered.',
        );
      });
    });
  });

  describe("tool call processing", () => {
    let toolKit: LlmToolKit;
    let mockExecutor: jest.Mock;

    beforeEach(() => {
      mockExecutor = jest.fn().mockResolvedValue({ success: true });
      toolKit = new LlmToolKit([{ name: "test", description: "test tool", executor: mockExecutor }]);
    });

    describe("processToolCall", () => {
      it("should process approved tool call", async () => {
        const toolCall: LlmToolCall = {
          id: "1",
          request: { id: "1", function: { name: "test", arguments: {} } },
          approvalState: "approved",
          executionState: "pending",
          result: null,
        };

        const result = await toolKit.processToolCall(toolCall);
        expect(result.handled).toBe(true);
        expect(result.toolCall.executionState).toBe("completed");
        expect(mockExecutor).toHaveBeenCalled();
      });

      it("should not process tool calls requiring approval", async () => {
        const toolCall: LlmToolCall = {
          id: "1",
          request: { id: "1", function: { name: "test", arguments: {} } },
          approvalState: "requiresApproval",
          executionState: "pending",
          result: null,
        };

        const result = await toolKit.processToolCall(toolCall);
        expect(result.handled).toBe(false);
        expect(mockExecutor).not.toHaveBeenCalled();
      });

      it("should handle rejected tool calls", async () => {
        const toolCall: LlmToolCall = {
          id: "1",
          request: { id: "1", function: { name: "test", arguments: {} } },
          approvalState: "rejected",
          executionState: "pending",
          result: null,
        };

        const result = await toolKit.processToolCall(toolCall);
        expect(result.handled).toBe(true);
        expect(result.toolCall.executionState).toBe("completed");
      });

      it("should handle tool execution errors", async () => {
        mockExecutor.mockRejectedValue(new Error("Test error"));
        const toolCall: LlmToolCall = {
          id: "1",
          request: { id: "1", function: { name: "test", arguments: {} } },
          approvalState: "approved",
          executionState: "pending",
          result: null,
        };

        const result = await toolKit.processToolCall(toolCall);
        expect(result.handled).toBe(true);
        expect(result.toolCall.executionState).toBe("error");
        expect(result.toolCall.error?.message).toBe("Test error");
      });
    });

    describe("classifyToolCalls", () => {
      it("should identify calls requiring approval", () => {
        const calls: LlmToolCall[] = [
          {
            id: "1",
            request: { id: "1", function: { name: "test", arguments: {} } },
            approvalState: "requiresApproval" as const,
            executionState: "pending" as const,
            result: null,
            error: null,
          },
        ];
        expect(toolKit.classifyToolCalls(calls)).toBe("approvalPending");
      });

      it("should identify completed calls", () => {
        const calls: LlmToolCall[] = [
          {
            id: "1",
            request: { id: "1", function: { name: "test", arguments: {} } },
            approvalState: "approved" as const,
            executionState: "completed" as const,
            result: { success: true },
            error: null,
          },
        ];
        expect(toolKit.classifyToolCalls(calls)).toBe("completed");
      });
    });
  });
});
