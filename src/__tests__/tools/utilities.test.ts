import { LlmAssistantMessageWithToolCalls, LlmMessage, LlmToolCall } from "../../providers";
import { LlmToolKit } from "../../tools/llm-tool-kit";

describe("Tool Call Utilities", () => {
  // Create a toolkit instance for testing
  const toolkit = new LlmToolKit([]);

  // Helper function to create test tool calls
  const createToolCall = (
    id: string,
    approvalState: LlmToolCall["approvalState"],
    executionState: LlmToolCall["executionState"],
    functionName = "test_function",
  ): LlmToolCall => {
    const baseCall = {
      id,
      approvalState,
      request: {
        id,
        function: {
          name: functionName,
          arguments: { arg: "value" },
        },
      },
    };

    switch (executionState) {
      case "pending":
        return {
          ...baseCall,
          executionState: "pending" as const,
          result: null,
        };
      case "inProgress":
        return {
          ...baseCall,
          executionState: "inProgress" as const,
          result: null,
        };
      case "completed":
        return {
          ...baseCall,
          executionState: "completed" as const,
          result: { success: true },
        };
      case "error":
        return {
          ...baseCall,
          executionState: "error" as const,
          result: null,
          error: {
            type: "TestError",
            message: "Test error",
            numberOfAttempts: 1,
            lastAttempt: new Date(),
          },
        };
      case "cancelled":
        return {
          ...baseCall,
          executionState: "cancelled" as const,
          result: null,
          error: {
            type: "ToolCancellation",
            message: "Tool was cancelled",
            numberOfAttempts: 1,
            lastAttempt: new Date(),
          },
        };
      default:
        throw new Error(`Unsupported execution state: ${executionState}`);
    }
  };

  // Helper function to create test message
  const createMessage = (toolCalls: LlmToolCall[]): LlmAssistantMessageWithToolCalls => ({
    id: "msg-1",
    role: "assistant_with_tools",
    content: "Test message",
    toolCalls,
    createdAt: Date.now(),
  });

  describe("Single Message Utilities", () => {
    describe("extractToolCallsRequiringApproval", () => {
      it("should extract tool calls requiring approval", () => {
        const toolCalls = [
          createToolCall("1", "requiresApproval", "pending"),
          createToolCall("2", "approved", "pending"),
          createToolCall("3", "requiresApproval", "pending"),
        ];
        const message = createMessage(toolCalls);

        const result = toolkit.utilities.message.extractToolCallsRequiringApproval(message);

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe("1");
        expect(result[1].id).toBe("3");
      });
    });

    describe("extractPendingToolCalls", () => {
      it("should extract pending tool calls", () => {
        const toolCalls = [
          createToolCall("1", "approved", "pending"),
          createToolCall("2", "approved", "completed"),
          createToolCall("3", "approved", "pending"),
        ];
        const message = createMessage(toolCalls);

        const result = toolkit.utilities.message.extractPendingToolCalls(message);

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe("1");
        expect(result[1].id).toBe("3");
      });
    });

    describe("extractCompletedToolCalls", () => {
      it("should extract completed tool calls", () => {
        const toolCalls = [
          createToolCall("1", "approved", "pending"),
          createToolCall("2", "approved", "completed"),
          createToolCall("3", "approved", "completed"),
        ];
        const message = createMessage(toolCalls);

        const result = toolkit.utilities.message.extractCompletedToolCalls(message);

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe("2");
        expect(result[1].id).toBe("3");
      });
    });

    describe("extractErroredToolCalls", () => {
      it("should extract errored tool calls", () => {
        const toolCalls = [
          createToolCall("1", "approved", "completed"),
          createToolCall("2", "approved", "error"),
          createToolCall("3", "approved", "error"),
        ];
        const message = createMessage(toolCalls);

        const result = toolkit.utilities.message.extractErroredToolCalls(message);

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe("2");
        expect(result[1].id).toBe("3");
      });
    });

    describe("classifyMessageToolCalls", () => {
      it("should classify as approvalPending when tool calls require approval", () => {
        const toolCalls = [
          createToolCall("1", "requiresApproval", "pending"),
          createToolCall("2", "requiresApproval", "pending"),
        ];
        const message = createMessage(toolCalls);

        expect(toolkit.utilities.message.classifyToolCalls(message)).toBe("approvalPending");
      });

      it("should classify as executionPending when tool calls are pending execution", () => {
        const toolCalls = [createToolCall("1", "approved", "pending"), createToolCall("2", "approved", "inProgress")];
        const message = createMessage(toolCalls);

        expect(toolkit.utilities.message.classifyToolCalls(message)).toBe("executionPending");
      });

      it("should classify as completed when all tool calls are completed", () => {
        const toolCalls = [createToolCall("1", "approved", "completed"), createToolCall("2", "approved", "completed")];
        const message = createMessage(toolCalls);

        expect(toolkit.utilities.message.classifyToolCalls(message)).toBe("completed");
      });

      it("should classify as executionPending when there are both pending and completed execution states", () => {
        const toolCalls = [createToolCall("1", "approved", "pending"), createToolCall("2", "approved", "completed")];
        const message = createMessage(toolCalls);

        expect(toolkit.utilities.message.classifyToolCalls(message)).toBe("executionPending");
      });

      it("should classify as completed when no tool calls exist", () => {
        const message = createMessage([]);

        expect(toolkit.utilities.message.classifyToolCalls(message)).toBe("completed");
      });
    });

    describe("hasToolCallsRequiringApproval", () => {
      it("should return true when tool calls require approval", () => {
        const toolCalls = [
          createToolCall("1", "requiresApproval", "pending"),
          createToolCall("2", "approved", "pending"),
        ];
        const message = createMessage(toolCalls);

        expect(toolkit.utilities.message.hasToolCallsRequiringApproval(message)).toBe(true);
      });

      it("should return false when no tool calls require approval", () => {
        const toolCalls = [createToolCall("1", "approved", "pending"), createToolCall("2", "approved", "pending")];
        const message = createMessage(toolCalls);

        expect(toolkit.utilities.message.hasToolCallsRequiringApproval(message)).toBe(false);
      });
    });

    describe("getNumberOfPendingToolCalls", () => {
      it("should return true when tool calls are pending", () => {
        const toolCalls = [createToolCall("1", "approved", "pending"), createToolCall("2", "approved", "completed")];
        const message = createMessage(toolCalls);

        expect(toolkit.utilities.message.hasPendingToolCalls(message)).toBe(true);
      });

      it("should return false when no tool calls are pending", () => {
        const toolCalls = [createToolCall("1", "approved", "completed"), createToolCall("2", "approved", "completed")];
        const message = createMessage(toolCalls);

        expect(toolkit.utilities.message.hasPendingToolCalls(message)).toBe(false);
      });
    });

    describe("approveToolCalls", () => {
      it("should approve all tool calls requiring approval when no IDs specified", () => {
        const toolCalls = [
          createToolCall("1", "requiresApproval", "pending"),
          createToolCall("2", "requiresApproval", "pending"),
          createToolCall("3", "approved", "pending"),
        ];
        const message = createMessage(toolCalls);

        const result = toolkit.utilities.message.approveToolCalls(message);

        expect(result.toolCalls[0].approvalState).toBe("approved");
        expect(result.toolCalls[1].approvalState).toBe("approved");
        expect(result.toolCalls[2].approvalState).toBe("approved"); // Already approved, unchanged
      });

      it("should approve specific tool calls when IDs specified", () => {
        const toolCalls = [
          createToolCall("1", "requiresApproval", "pending"),
          createToolCall("2", "requiresApproval", "pending"),
        ];
        const message = createMessage(toolCalls);

        const result = toolkit.utilities.message.approveToolCalls(message, { toolCallIds: "1" });

        expect(result.toolCalls[0].approvalState).toBe("approved");
        expect(result.toolCalls[1].approvalState).toBe("requiresApproval"); // Unchanged
      });

      it("should approve multiple specific tool calls when array of IDs specified", () => {
        const toolCalls = [
          createToolCall("1", "requiresApproval", "pending"),
          createToolCall("2", "requiresApproval", "pending"),
          createToolCall("3", "requiresApproval", "pending"),
        ];
        const message = createMessage(toolCalls);

        const result = toolkit.utilities.message.approveToolCalls(message, { toolCallIds: ["1", "3"] });

        expect(result.toolCalls[0].approvalState).toBe("approved");
        expect(result.toolCalls[1].approvalState).toBe("requiresApproval"); // Unchanged
        expect(result.toolCalls[2].approvalState).toBe("approved");
      });
    });

    describe("rejectToolCalls", () => {
      it("should reject tool calls requiring approval", () => {
        const toolCalls = [
          createToolCall("1", "requiresApproval", "pending"),
          createToolCall("2", "approved", "pending"),
        ];
        const message = createMessage(toolCalls);

        const result = toolkit.utilities.message.rejectToolCalls(message);

        expect(result.toolCalls[0].approvalState).toBe("rejected");
        expect(result.toolCalls[1].approvalState).toBe("approved"); // Unchanged
      });
    });

    describe("cancelToolCalls", () => {
      it("should cancel pending tool calls", () => {
        const toolCalls = [createToolCall("1", "approved", "pending"), createToolCall("2", "approved", "completed")];
        const message = createMessage(toolCalls);

        const result = toolkit.utilities.message.cancelToolCalls(message);

        expect(result.toolCalls[0].executionState).toBe("cancelled");
        expect(result.toolCalls[0].error?.type).toBe("ToolCancellation");
        expect(result.toolCalls[1].executionState).toBe("completed"); // Unchanged
      });
    });
  });

  describe("Message List Utilities", () => {
    const createTestMessages = (): LlmMessage[] => [
      {
        id: "sys-1",
        role: "system",
        content: "System message",
        createdAt: Date.now(),
      },
      createMessage([createToolCall("1", "requiresApproval", "pending"), createToolCall("2", "approved", "pending")]),
      {
        id: "user-1",
        role: "user",
        content: [{ type: "text", text: "User message" }],
        createdAt: Date.now(),
      },
      createMessage([createToolCall("3", "approved", "completed"), createToolCall("4", "approved", "completed")]),
    ];

    describe("findMessagesWithApprovalRequired", () => {
      it("should find messages with tool calls requiring approval", () => {
        const messages = createTestMessages();

        const result = toolkit.utilities.messages.extractMessagesWithApprovalRequired(messages);

        expect(result).toHaveLength(1);
        expect(result[0].toolCalls[0].id).toBe("1");
      });
    });

    describe("findMessagesWithPendingToolCalls", () => {
      it("should find messages with pending tool calls", () => {
        const messages = createTestMessages();

        const result = toolkit.utilities.messages.extractMessagesWithPendingToolCalls(messages);

        expect(result).toHaveLength(1);
        expect(result[0].toolCalls.some((call) => call.executionState === "pending")).toBe(true);
      });
    });

    describe("findLatestMessageWithApprovalRequired", () => {
      it("should find the latest message with approval required", () => {
        const messages = [...createTestMessages(), createMessage([createToolCall("5", "requiresApproval", "pending")])];

        const result = toolkit.utilities.messages.getLatestMessageWithApprovalRequired(messages);

        expect(result).not.toBeNull();
        expect(result!.toolCalls[0].id).toBe("5");
      });

      it("should return null when no messages require approval", () => {
        const messages = [createMessage([createToolCall("1", "approved", "completed")])];

        const result = toolkit.utilities.messages.getLatestMessageWithApprovalRequired(messages);

        expect(result).toBeNull();
      });
    });

    describe("approveToolCallsInMessages", () => {
      it("should approve tool calls in all messages", () => {
        const messages = createTestMessages();

        const result = toolkit.utilities.messages.approveToolCalls(messages);

        const assistantMessages = result.filter(
          (msg): msg is LlmAssistantMessageWithToolCalls => msg.role === "assistant_with_tools",
        );

        expect(assistantMessages[0].toolCalls[0].approvalState).toBe("approved");
      });
    });

    describe("getToolCallSummary", () => {
      it("should provide accurate summary of tool call states", () => {
        const messages = createTestMessages();

        const summary = toolkit.utilities.messages.getToolCallSummary(messages);

        expect(summary.totalToolCalls).toBe(4);
        expect(summary.requiresApproval).toBe(1);
        expect(summary.approved).toBe(3);
        expect(summary.pending).toBe(2);
        expect(summary.completed).toBe(2);
      });
    });
  });
});
