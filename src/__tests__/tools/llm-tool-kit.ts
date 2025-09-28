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
      toolKit = new LlmToolKit([
        { name: "test", description: "test tool", executor: mockExecutor },
        {
          name: "errorTool",
          description: "error tool",
          executor: () => {
            throw new Error("Deliberate error");
          },
        },
        {
          name: "nonErrorTool",
          description: "non-error tool",
          executor: () => {
            throw "String exception";
          },
        },
      ]);
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

      it("should increment error attempt count on repeated failures", async () => {
        const initialToolCall: LlmToolCall = {
          id: "1",
          request: { id: "1", function: { name: "errorTool", arguments: {} } },
          approvalState: "approved",
          executionState: "pending",
          result: null,
          error: null,
        };

        // First attempt
        const firstResult = await toolKit.processToolCall(initialToolCall);
        expect(firstResult.toolCall.executionState).toBe("error");
        expect(firstResult.toolCall.error?.numberOfAttempts).toBe(1);

        // Second attempt
        const secondResult = await toolKit.processToolCall(firstResult.toolCall, { retryFailed: true });
        expect(secondResult.toolCall.executionState).toBe("error");
        expect(secondResult.toolCall.error?.numberOfAttempts).toBe(2);
      });

      it("should handle non-Error exceptions in tool execution", async () => {
        const toolCall: LlmToolCall = {
          id: "1",
          request: { id: "1", function: { name: "nonErrorTool", arguments: {} } },
          approvalState: "approved",
          executionState: "pending",
          result: null,
        };

        const result = await toolKit.processToolCall(toolCall);
        expect(result.toolCall.executionState).toBe("error");
        expect(result.toolCall.error?.message).toBe("Unable to execute tool: nonErrorTool");
        expect(result.toolCall.error?.type).toBe("ToolExecutionError");
      });

      it("should handle tool not found error", async () => {
        const toolCall: LlmToolCall = {
          id: "1",
          request: { id: "1", function: { name: "nonexistentTool", arguments: {} } },
          approvalState: "approved",
          executionState: "pending",
          result: null,
        };

        const result = await toolKit.processToolCall(toolCall);
        expect(result.toolCall.executionState).toBe("error");
        expect(result.toolCall.error?.message).toBe("Tool not found: nonexistentTool");
        expect(result.toolCall.error?.type).toBe("ToolNotFoundError");
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

    it("should handle empty objects", () => {
      const emptyObj = {};
      const serialized = LlmToolKit.serialize(emptyObj);
      const deserialized = LlmToolKit.deserialize(serialized);

      expect(deserialized).toEqual(emptyObj);
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

        const result = toolkit.utilities.message.rejectToolCalls(input, { toolCallIds: "1" });
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

        const result = toolkit.utilities.message.rejectToolCalls(input, { toolCallIds: ["1", "3"] });
        expect(result.toolCalls[0].approvalState).toBe("rejected");
        expect(result.toolCalls[1].approvalState).toBe("requiresApproval");
        expect(result.toolCalls[2].approvalState).toBe("rejected");
      });

      it("should reject all tool calls when no IDs provided", () => {
        const input = {
          toolCalls: [createPendingToolCall("1", "tool1"), createPendingToolCall("2", "tool2")],
        };

        const result = toolkit.utilities.message.rejectToolCalls(input);
        expect(result.toolCalls.every((call) => call.approvalState === "rejected")).toBe(true);
      });

      it("should not modify already approved/rejected calls", () => {
        const input = {
          toolCalls: [
            createPendingToolCall("1", "tool1", "approved"),
            createPendingToolCall("2", "tool2", "requiresApproval"),
          ],
        };

        const result = toolkit.utilities.message.rejectToolCalls(input);
        expect(result.toolCalls[0].approvalState).toBe("approved");
        expect(result.toolCalls[1].approvalState).toBe("rejected");
      });
    });

    describe("approveCalls", () => {
      it("should approve a single tool call by ID", () => {
        const input = {
          toolCalls: [createPendingToolCall("1", "tool1"), createPendingToolCall("2", "tool2")],
        };

        const result = toolkit.utilities.message.approveToolCalls(input, { toolCallIds: "1" });
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

        const result = toolkit.utilities.message.approveToolCalls(input, { toolCallIds: ["1", "3"] });
        expect(result.toolCalls[0].approvalState).toBe("approved");
        expect(result.toolCalls[1].approvalState).toBe("requiresApproval");
        expect(result.toolCalls[2].approvalState).toBe("approved");
      });

      it("should approve all tool calls when no IDs provided", () => {
        const input = {
          toolCalls: [createPendingToolCall("1", "tool1"), createPendingToolCall("2", "tool2")],
        };

        const result = toolkit.utilities.message.approveToolCalls(input);
        expect(result.toolCalls.every((call) => call.approvalState === "approved")).toBe(true);
      });

      it("should not modify already approved/rejected calls", () => {
        const input = {
          toolCalls: [
            createPendingToolCall("1", "tool1", "rejected"),
            createPendingToolCall("2", "tool2", "requiresApproval"),
          ],
        };

        const result = toolkit.utilities.message.approveToolCalls(input);
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

        const result = toolkit.utilities.message.approveToolCalls(input);
        expect((result as any).someOtherProperty).toBe("value");
        expect(result.toolCalls[0].request.function.arguments).toEqual({ foo: "bar" });
        expect(result.toolCalls[0].executionState).toBe("pending");
      });
    });
  });

  describe("processCalls", () => {
    let toolKit: LlmToolKit;
    let mockExecutor1: jest.Mock;
    let mockExecutor2: jest.Mock;

    beforeEach(() => {
      mockExecutor1 = jest.fn().mockResolvedValue({ result: "tool1 result" });
      mockExecutor2 = jest.fn().mockResolvedValue({ result: "tool2 result" });

      toolKit = new LlmToolKit([
        { name: "tool1", description: "first tool", executor: mockExecutor1 },
        { name: "tool2", description: "second tool", executor: mockExecutor2 },
        { name: "transferTool", description: "transfer tool", executor: "transfer" },
      ]);
    });

    it("should process all tool calls in an object", async () => {
      const input = {
        content: "Some message",
        toolCalls: [
          {
            id: "1",
            request: { id: "1", function: { name: "tool1", arguments: { param: "value1" } } },
            approvalState: "approved" as const,
            executionState: "pending" as const,
            result: null,
            error: null,
          },
          {
            id: "2",
            request: { id: "2", function: { name: "tool2", arguments: { param: "value2" } } },
            approvalState: "approved" as const,
            executionState: "pending" as const,
            result: null,
            error: null,
          },
        ],
      };

      const result = await toolKit.processCalls(input);

      expect(result.content).toBe("Some message");
      expect(result.toolCalls).toHaveLength(2);

      expect(result.toolCalls[0].executionState).toBe("completed");
      expect(result.toolCalls[0].result).toEqual({ result: "tool1 result" });

      expect(result.toolCalls[1].executionState).toBe("completed");
      expect(result.toolCalls[1].result).toEqual({ result: "tool2 result" });

      expect(mockExecutor1).toHaveBeenCalledWith({ param: "value1" }, {}, {});
      expect(mockExecutor2).toHaveBeenCalledWith({ param: "value2" }, {}, {});
    });

    it("should pass context and secureContext to tool executors", async () => {
      const input = {
        toolCalls: [
          {
            id: "1",
            request: { id: "1", function: { name: "tool1", arguments: {} } },
            approvalState: "approved" as const,
            executionState: "pending" as const,
            result: null,
          },
        ],
      };

      const context = { userId: "123" };
      const secureContext = { apiKey: "secret" };

      await toolKit.processCalls(input, { context, secureContext });

      expect(mockExecutor1).toHaveBeenCalledWith({}, context, secureContext);
    });

    it("should retry failed tool calls when retryFailed is true", async () => {
      const input = {
        toolCalls: [
          {
            id: "1",
            request: { id: "1", function: { name: "tool1", arguments: {} } },
            approvalState: "approved" as const,
            executionState: "error" as const,
            result: null,
            error: {
              message: "Previous error",
              type: "Error",
              numberOfAttempts: 1,
              lastAttempt: new Date(),
            },
          },
        ],
      };

      await toolKit.processCalls(input, { retryFailed: true });

      expect(mockExecutor1).toHaveBeenCalled();
    });

    it("should not retry failed tool calls by default", async () => {
      const input = {
        toolCalls: [
          {
            id: "1",
            request: { id: "1", function: { name: "tool1", arguments: {} } },
            approvalState: "approved" as const,
            executionState: "error" as const,
            result: null,
            error: {
              message: "Previous error",
              type: "Error",
              numberOfAttempts: 1,
              lastAttempt: new Date(),
            },
          },
        ],
      };

      await toolKit.processCalls(input);

      expect(mockExecutor1).not.toHaveBeenCalled();
    });

    it("should throw error when trying to process transfer tools", async () => {
      const input = {
        toolCalls: [
          {
            id: "1",
            request: { id: "1", function: { name: "transferTool", arguments: {} } },
            approvalState: "approved" as const,
            executionState: "pending" as const,
            result: null,
          },
        ],
      };

      await expect(toolKit.processCalls(input)).rejects.toThrow("Transfer tools cannot be processed by this method");
    });
  });

  describe("edge cases", () => {
    it("should handle empty tool array", () => {
      const toolkit = new LlmToolKit([]);
      expect(toolkit.hasTools).toBe(false);
      expect(toolkit.tools).toEqual([]);
      expect(toolkit.asLlmFunctions).toBeUndefined();
    });

    it("should handle mixed tool types in the same toolkit", () => {
      const toolkit = new LlmToolKit([
        { name: "function", description: "function tool", executor: jest.fn() },
        { name: "definition", description: "definition tool" },
        { name: "transfer", description: "transfer tool", executor: "transfer" },
        { name: "subtask", description: "subtask tool", executor: "subTask" },
      ]);

      expect(toolkit.tools.length).toBe(4);
      expect(toolkit.tools[0].type).toBe("function");
      expect(toolkit.tools[1].type).toBe("functionDefinition");
      expect(toolkit.tools[2].type).toBe("transfer");
      expect(toolkit.tools[3].type).toBe("subTask");
    });

    it("should handle tools with confirmation required", () => {
      const toolkit = new LlmToolKit([
        { name: "normal", description: "normal tool" },
        { name: "confirm", description: "confirmation tool", requiresConfirmation: true },
      ]);

      expect(toolkit.tools[0].requiresConfirmation).toBe(false);
      expect(toolkit.tools[1].requiresConfirmation).toBe(true);
    });
  });
});
