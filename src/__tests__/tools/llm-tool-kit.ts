import { LlmToolCall, LlmToolCall__Pending, LlmToolCallApprovalState } from "../../providers";
import { LlmTool, LlmToolKit } from "../../tools";

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

  describe("asLlmFunctions", () => {
    it("should return undefined when no tools exist", () => {
      const toolkit = new LlmToolKit([]);
      expect(toolkit.asLlmFunctions).toBeUndefined();
    });

    it("should return array of LlmFunction objects for existing tools", () => {
      const toolkit = new LlmToolKit([
        {
          name: "test",
          description: "test tool",
          params: {
            type: "object",
            properties: {
              foo: { type: "string" },
            },
          },
        },
      ]);

      expect(toolkit.asLlmFunctions).toEqual([
        {
          type: "function",
          function: {
            name: "test",
            description: "test tool",
            parameters: {
              type: "object",
              properties: {
                foo: { type: "string" },
              },
              required: [],
              additionalProperties: false,
            },
          },
        },
      ]);
    });
  });

  describe("serialization", () => {
    it("should correctly serialize and deserialize objects", () => {
      const testObj = {
        date: new Date("2024-01-01"),
        value: "test",
      };

      const serialized = LlmToolKit.serialize(testObj);
      const deserialized = LlmToolKit.deserialize(serialized);

      expect(deserialized).toEqual(testObj);
      expect((deserialized as any).date instanceof Date).toBeTruthy();
    });
  });

  describe("withAllowedToolsOnly", () => {
    it("should create new toolkit with only allowed tools", () => {
      const toolkit = new LlmToolKit([
        { name: "tool1", description: "first tool" },
        { name: "tool2", description: "second tool" },
        { name: "tool3", description: "third tool" },
      ]);

      const filteredToolkit = toolkit.withAllowedToolsOnly(["tool1", "tool3"]);

      expect(filteredToolkit.tools.length).toBe(2);
      expect(filteredToolkit.tools.map((t) => t.name)).toEqual(["tool1", "tool3"]);
      expect(filteredToolkit.allowParallelCalls).toBe(toolkit.allowParallelCalls);
    });
  });

  describe("classifyToolCalls", () => {
    let toolkit: LlmToolKit;

    beforeEach(() => {
      toolkit = new LlmToolKit([
        { name: "normalTool", description: "normal tool" },
        { name: "transferTool", description: "transfer tool", executor: "transfer" },
        { name: "definitionTool", description: "definition only tool" },
      ]);
    });

    it("should identify approval pending calls", () => {
      const calls: LlmToolCall[] = [
        {
          id: "1",
          request: { id: "1", function: { name: "normalTool", arguments: {} } },
          approvalState: "requiresApproval",
          executionState: "pending",
          result: null,
        },
      ];

      expect(toolkit.classifyToolCalls(calls)).toBe("approvalPending");
    });

    it("should identify transfer pending calls", () => {
      const calls: LlmToolCall[] = [
        {
          id: "1",
          request: { id: "1", function: { name: "transferTool", arguments: {} } },
          approvalState: "approved",
          executionState: "pending",
          result: null,
        },
      ];

      expect(toolkit.classifyToolCalls(calls)).toBe("transferPending");
    });

    it("should identify missing executor calls", () => {
      const calls: LlmToolCall[] = [
        {
          id: "1",
          request: { id: "1", function: { name: "definitionTool", arguments: {} } },
          approvalState: "approved",
          executionState: "pending",
          result: null,
        },
      ];

      expect(toolkit.classifyToolCalls(calls)).toBe("missingExecutor");
    });

    it("should identify completed calls", () => {
      const calls: LlmToolCall[] = [
        {
          id: "1",
          request: { id: "1", function: { name: "normalTool", arguments: {} } },
          approvalState: "approved",
          executionState: "completed",
          result: {},
        },
      ];

      expect(toolkit.classifyToolCalls(calls)).toBe("completed");
    });
  });

  describe("error handling", () => {
    it("should throw error when registering duplicate tool", () => {
      const toolkit = new LlmToolKit([{ name: "tool1", description: "test tool" }]);

      expect(() => {
        toolkit.registerTool({ name: "tool1", description: "duplicate tool" });
      }).toThrow("A tool with name tool1 already exists");
    });

    it("should throw error when tool not found in getTool", () => {
      const toolkit = new LlmToolKit([]);
      expect(toolkit.getTool("nonexistent")).toBeNull();
    });

    it("should throw error when unregistering non-existent tool", () => {
      const toolkit = new LlmToolKit([]);
      expect(() => {
        toolkit.unregisterTool("nonexistent");
      }).toThrow("Tool not found: nonexistent");
    });

    it("should throw error when unregistering transfer tool", () => {
      const toolkit = new LlmToolKit([{ name: "transferTool", description: "transfer tool", executor: "transfer" }]);

      expect(() => {
        toolkit.unregisterTool("transferTool");
      }).toThrow('Cannot unregister tool "transferTool". transfer tools cannot be unregistered.');
    });
  });

  describe("getNextToolCall", () => {
    let toolkit: LlmToolKit;

    beforeEach(() => {
      toolkit = new LlmToolKit([
        { name: "tool1", description: "first tool" },
        { name: "tool2", description: "second tool" },
      ]);
    });

    it("should return null when no tool calls need processing", () => {
      const calls: LlmToolCall[] = [
        {
          id: "1",
          request: { id: "1", function: { name: "tool1", arguments: {} } },
          approvalState: "approved",
          executionState: "completed",
          result: {},
        },
      ];

      expect(toolkit.getNextToolCall(calls)).toBeNull();
    });

    it("should return first pending tool call", () => {
      const pendingCall: LlmToolCall = {
        id: "1",
        request: { id: "1", function: { name: "tool1", arguments: {} } },
        approvalState: "approved",
        executionState: "pending",
        result: null,
      };

      const completedCall: LlmToolCall = {
        id: "2",
        request: { id: "2", function: { name: "tool2", arguments: {} } },
        approvalState: "approved",
        executionState: "completed",
        result: {},
      };

      const result = toolkit.getNextToolCall([completedCall, pendingCall]);
      expect(result).toEqual({
        toolCall: pendingCall,
        tool: toolkit.getTool("tool1"),
      });
    });

    it("should return first in-progress tool call", () => {
      const inProgressCall: LlmToolCall = {
        id: "1",
        request: { id: "1", function: { name: "tool1", arguments: {} } },
        approvalState: "approved",
        executionState: "inProgress",
        result: null,
      };

      const pendingCall: LlmToolCall = {
        id: "2",
        request: { id: "2", function: { name: "tool2", arguments: {} } },
        approvalState: "approved",
        executionState: "pending",
        result: null,
      };

      const result = toolkit.getNextToolCall([inProgressCall, pendingCall]);
      expect(result).toEqual({
        toolCall: inProgressCall,
        tool: toolkit.getTool("tool1"),
      });
    });

    it("should prioritize first pending/inProgress call in the array", () => {
      const firstPendingCall: LlmToolCall = {
        id: "1",
        request: { id: "1", function: { name: "tool1", arguments: {} } },
        approvalState: "approved",
        executionState: "pending",
        result: null,
      };

      const secondPendingCall: LlmToolCall = {
        id: "2",
        request: { id: "2", function: { name: "tool2", arguments: {} } },
        approvalState: "approved",
        executionState: "pending",
        result: null,
      };

      const result = toolkit.getNextToolCall([firstPendingCall, secondPendingCall]);
      expect(result).toEqual({
        toolCall: firstPendingCall,
        tool: toolkit.getTool("tool1"),
      });
    });

    it("should throw error when tool is not found", () => {
      const pendingCall: LlmToolCall = {
        id: "1",
        request: { id: "1", function: { name: "nonexistentTool", arguments: {} } },
        approvalState: "approved",
        executionState: "pending",
        result: null,
      };

      expect(() => toolkit.getNextToolCall([pendingCall])).toThrow("Tool not found: nonexistentTool");
    });

    it("should ignore completed and error state calls", () => {
      const completedCall: LlmToolCall = {
        id: "1",
        request: { id: "1", function: { name: "tool1", arguments: {} } },
        approvalState: "approved",
        executionState: "completed",
        result: {},
      };

      const errorCall: LlmToolCall = {
        id: "2",
        request: { id: "2", function: { name: "tool2", arguments: {} } },
        approvalState: "approved",
        executionState: "error",
        result: null,
        error: {
          type: "Error",
          message: "Test error",
          numberOfAttempts: 1,
          lastAttempt: new Date(),
        },
      };

      expect(toolkit.getNextToolCall([completedCall, errorCall])).toBeNull();
    });

    it("should handle empty tool calls array", () => {
      expect(toolkit.getNextToolCall([])).toBeNull();
    });
  });

  describe("approval and rejection", () => {
    let toolkit: LlmToolKit;

    beforeEach(() => {
      toolkit = new LlmToolKit([
        { name: "tool1", description: "first tool" },
        { name: "tool2", description: "second tool", requiresConfirmation: true },
      ]);
    });

    // Helper function to create a pending tool call
    const createPendingToolCall = (
      id: string,
      toolName: string,
      approvalState: LlmToolCallApprovalState = "requiresApproval",
    ): LlmToolCall__Pending => ({
      id,
      request: {
        id,
        function: {
          name: toolName,
          arguments: {},
        },
      },
      approvalState,
      executionState: "pending",
      result: null,
      error: null,
    });

    describe("rejectCalls", () => {
      it("should reject a single tool call by ID", () => {
        const input = {
          toolCalls: [createPendingToolCall("1", "tool1"), createPendingToolCall("2", "tool2")],
        };

        const result = toolkit.rejectCalls(input, "1");
        expect(result.toolCalls[0].approvalState).toBe("rejected");
        expect(result.toolCalls[1].approvalState).toBe("requiresApproval");
      });

      it("should reject multiple tool calls by IDs", () => {
        const input = {
          toolCalls: [
            createPendingToolCall("1", "tool1"),
            createPendingToolCall("2", "tool2"),
            createPendingToolCall("3", "tool1"),
          ],
        };

        const result = toolkit.rejectCalls(input, ["1", "3"]);
        expect(result.toolCalls[0].approvalState).toBe("rejected");
        expect(result.toolCalls[1].approvalState).toBe("requiresApproval");
        expect(result.toolCalls[2].approvalState).toBe("rejected");
      });

      it("should reject all tool calls when no IDs provided", () => {
        const input = {
          toolCalls: [createPendingToolCall("1", "tool1"), createPendingToolCall("2", "tool2")],
        };

        const result = toolkit.rejectCalls(input);
        expect(result.toolCalls.every((call) => call.approvalState === "rejected")).toBe(true);
      });

      it("should not modify already approved/rejected calls", () => {
        const input = {
          toolCalls: [
            createPendingToolCall("1", "tool1", "approved"),
            createPendingToolCall("2", "tool2", "requiresApproval"),
          ],
        };

        const result = toolkit.rejectCalls(input);
        expect(result.toolCalls[0].approvalState).toBe("approved");
        expect(result.toolCalls[1].approvalState).toBe("rejected");
      });
    });

    describe("approveCalls", () => {
      it("should approve a single tool call by ID", () => {
        const input = {
          toolCalls: [createPendingToolCall("1", "tool1"), createPendingToolCall("2", "tool2")],
        };

        const result = toolkit.approveCalls(input, "1");
        expect(result.toolCalls[0].approvalState).toBe("approved");
        expect(result.toolCalls[1].approvalState).toBe("requiresApproval");
      });

      it("should approve multiple tool calls by IDs", () => {
        const input = {
          toolCalls: [
            createPendingToolCall("1", "tool1"),
            createPendingToolCall("2", "tool2"),
            createPendingToolCall("3", "tool1"),
          ],
        };

        const result = toolkit.approveCalls(input, ["1", "3"]);
        expect(result.toolCalls[0].approvalState).toBe("approved");
        expect(result.toolCalls[1].approvalState).toBe("requiresApproval");
        expect(result.toolCalls[2].approvalState).toBe("approved");
      });

      it("should approve all tool calls when no IDs provided", () => {
        const input = {
          toolCalls: [createPendingToolCall("1", "tool1"), createPendingToolCall("2", "tool2")],
        };

        const result = toolkit.approveCalls(input);
        expect(result.toolCalls.every((call) => call.approvalState === "approved")).toBe(true);
      });

      it("should not modify already approved/rejected calls", () => {
        const input = {
          toolCalls: [
            createPendingToolCall("1", "tool1", "rejected"),
            createPendingToolCall("2", "tool2", "requiresApproval"),
          ],
        };

        const result = toolkit.approveCalls(input);
        expect(result.toolCalls[0].approvalState).toBe("rejected");
        expect(result.toolCalls[1].approvalState).toBe("approved");
      });

      it("should preserve other properties when approving/rejecting", () => {
        const input = {
          someOtherProperty: "value",
          toolCalls: [
            {
              id: "1",
              request: {
                id: "1",
                function: {
                  name: "tool1",
                  arguments: { foo: "bar" },
                },
              },
              approvalState: "requiresApproval" as const,
              executionState: "pending" as const,
              result: null,
              error: null,
            },
          ],
        };

        const result = toolkit.approveCalls(input);
        expect(result.someOtherProperty).toBe("value");
        expect(result.toolCalls[0].request.function.arguments).toEqual({ foo: "bar" });
        expect(result.toolCalls[0].executionState).toBe("pending");
      });
    });
  });
});
