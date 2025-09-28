import { LlmMessageBase, LlmToolCall, ToolCallClassification, WithToolCalls } from "../providers";

/**
 * Generic type for messages that contain tool calls
 * This allows consumers to add additional fields while still using the toolkit
 */
interface WithToolCallsMessage extends LlmMessageBase, WithToolCalls {
  role: "assistant_with_tools";
}

/**
 * Options for tool call operations
 */
interface ToolCallOperationOptions {
  /** Specific tool call IDs to target. If not provided, applies to all applicable calls */
  toolCallIds?: string | string[];
}

/**
 * Static utilities for working with individual tool calls
 */
class LlmToolCallUtilities {
  /**
   * Extract tool calls that require approval
   * @param toolCalls - Array of tool calls
   * @returns Array of tool calls that require approval
   */
  extractRequiringApproval(toolCalls: LlmToolCall[]): LlmToolCall[] {
    return toolCalls.filter((call) => call.approvalState === "requiresApproval");
  }

  /**
   * Extract tool calls that are pending execution
   * @param toolCalls - Array of tool calls
   * @returns Array of tool calls that are pending execution
   */
  extractPending(toolCalls: LlmToolCall[]): LlmToolCall[] {
    return toolCalls.filter((call) => call.executionState === "pending");
  }

  /**
   * Extract tool calls that are completed
   * @param toolCalls - Array of tool calls
   * @returns Array of tool calls that are completed
   */
  extractCompleted(toolCalls: LlmToolCall[]): LlmToolCall[] {
    return toolCalls.filter((call) => call.executionState === "completed");
  }

  /**
   * Extract tool calls that have errors
   * @param toolCalls - Array of tool calls
   * @returns Array of tool calls that have errors
   */
  extractErrored(toolCalls: LlmToolCall[]): LlmToolCall[] {
    return toolCalls.filter((call) => call.executionState === "error");
  }

  /**
   * Classify tool calls
   * @param toolCalls - Array of tool calls
   * @returns Classification of the tool calls
   */
  classify(toolCalls: LlmToolCall[]): ToolCallClassification {
    if (toolCalls.length === 0) return "completed";

    const hasApprovalPending = toolCalls.some((call) => call.approvalState === "requiresApproval");
    if (hasApprovalPending) return "approvalPending";

    const hasExecutionPending = toolCalls.some(
      (call) => call.executionState === "pending" || call.executionState === "inProgress",
    );
    if (hasExecutionPending) return "executionPending";

    return "completed";
  }

  /**
   * Check if any tool calls require approval
   * @param toolCalls - Array of tool calls
   * @returns True if any tool calls require approval
   */
  hasRequiringApproval(toolCalls: LlmToolCall[]): boolean {
    return toolCalls.some((call) => call.approvalState === "requiresApproval");
  }

  /**
   * Check if any tool calls are pending
   * @param toolCalls - Array of tool calls
   * @returns True if any tool calls are pending execution
   */
  hasPending(toolCalls: LlmToolCall[]): boolean {
    return toolCalls.some((call) => call.executionState === "pending" || call.executionState === "inProgress");
  }

  /**
   * Approve tool calls
   * @param toolCalls - Array of tool calls
   * @param options - Options for the operation
   * @returns New array with approved tool calls
   */
  approve(toolCalls: LlmToolCall[], options: ToolCallOperationOptions = {}): LlmToolCall[] {
    return this.updateApprovalState(toolCalls, "approved", options);
  }

  /**
   * Reject tool calls
   * @param toolCalls - Array of tool calls
   * @param options - Options for the operation
   * @returns New array with rejected tool calls
   */
  reject(toolCalls: LlmToolCall[], options: ToolCallOperationOptions = {}): LlmToolCall[] {
    return this.updateApprovalState(toolCalls, "rejected", options);
  }

  /**
   * Cancel tool calls
   * @param toolCalls - Array of tool calls
   * @param options - Options for the operation
   * @returns New array with cancelled tool calls
   */
  cancel(toolCalls: LlmToolCall[], options: ToolCallOperationOptions = {}): LlmToolCall[] {
    const targetIds = this.normalizeToolCallIds(options.toolCallIds);

    return toolCalls.map((call) => {
      if (
        (call.executionState === "pending" || call.executionState === "inProgress") &&
        (!targetIds || targetIds.includes(call.id))
      ) {
        return {
          ...call,
          executionState: "cancelled" as const,
          result: null,
          error: {
            message: "Tool call was cancelled",
            type: "ToolCancellation",
            numberOfAttempts: 0,
            lastAttempt: new Date(),
          },
        };
      }
      return call;
    });
  }

  /**
   * Update tool call approval state
   * @internal
   */
  private updateApprovalState(
    toolCalls: LlmToolCall[],
    approvalState: "approved" | "rejected",
    options: ToolCallOperationOptions,
  ): LlmToolCall[] {
    const targetIds = this.normalizeToolCallIds(options.toolCallIds);

    return toolCalls.map((call) => {
      if (call.approvalState === "requiresApproval" && (!targetIds || targetIds.includes(call.id))) {
        return { ...call, approvalState };
      }
      return call;
    });
  }

  /**
   * Normalize tool call IDs to an array or null
   * @internal
   */
  private normalizeToolCallIds(toolCallIds?: string | string[]): string[] | null {
    if (!toolCallIds || toolCallIds.length === 0) return null;
    return Array.isArray(toolCallIds) ? toolCallIds : [toolCallIds];
  }
}

const toolCallUtilities = new LlmToolCallUtilities();

/**
 * Utilities for working with messages containing tool calls
 */
class LlmMessageUtilities {
  /**
   * Extract tool calls that require approval from an object with tool calls
   * @param input - The object with tool calls
   * @returns Array of tool calls that require approval
   */
  extractToolCallsRequiringApproval<T extends WithToolCalls>(input: T): LlmToolCall[] {
    return toolCallUtilities.extractRequiringApproval(input.toolCalls);
  }

  /**
   * Extract tool calls that are pending execution from an object with tool calls
   * @param input - The object with tool calls
   * @returns Array of tool calls that are pending execution
   */
  extractPendingToolCalls<T extends WithToolCalls>(input: T): LlmToolCall[] {
    return toolCallUtilities.extractPending(input.toolCalls);
  }

  /**
   * Extract tool calls that are completed from an object with tool calls
   * @param input - The object with tool calls
   * @returns Array of tool calls that are completed
   */
  extractCompletedToolCalls<T extends WithToolCalls>(input: T): LlmToolCall[] {
    return toolCallUtilities.extractCompleted(input.toolCalls);
  }

  /**
   * Extract tool calls that have errors from an object with tool calls
   * @param input - The object with tool calls
   * @returns Array of tool calls that have errors
   */
  extractErroredToolCalls<T extends WithToolCalls>(input: T): LlmToolCall[] {
    return toolCallUtilities.extractErrored(input.toolCalls);
  }

  /**
   * Classify the tool calls in an object with tool calls
   * @param input - The object with tool calls
   * @returns Classification of the tool calls
   */
  classifyToolCalls<T extends WithToolCalls>(input: T): ToolCallClassification {
    return toolCallUtilities.classify(input.toolCalls);
  }

  /**
   * Check if an object has any tool calls requiring approval
   * @param input - The object with tool calls
   * @returns True if any tool calls require approval
   */
  hasToolCallsRequiringApproval<T extends WithToolCalls>(input: T): boolean {
    return toolCallUtilities.hasRequiringApproval(input.toolCalls);
  }

  /**
   * Check if an object has any pending tool calls
   * @param input - The object with tool calls
   * @returns True if any tool calls are pending execution
   */
  hasPendingToolCalls<T extends WithToolCalls>(input: T): boolean {
    return toolCallUtilities.hasPending(input.toolCalls);
  }

  /**
   * Approve tool calls in an object with tool calls
   * @param input - The object with tool calls
   * @param options - Options for the operation
   * @returns New object with approved tool calls
   */
  approveToolCalls<T extends WithToolCalls>(input: T, options: ToolCallOperationOptions = {}): T {
    const updatedToolCalls = toolCallUtilities.approve(input.toolCalls, options);
    return { ...input, toolCalls: updatedToolCalls };
  }

  /**
   * Reject tool calls in an object with tool calls
   * @param input - The object with tool calls
   * @param options - Options for the operation
   * @returns New object with rejected tool calls
   */
  rejectToolCalls<T extends WithToolCalls>(input: T, options: ToolCallOperationOptions = {}): T {
    const updatedToolCalls = toolCallUtilities.reject(input.toolCalls, options);
    return { ...input, toolCalls: updatedToolCalls };
  }

  /**
   * Cancel tool calls in an object with tool calls
   * @param input - The object with tool calls
   * @param options - Options for the operation
   * @returns New object with cancelled tool calls
   */
  cancelToolCalls<T extends WithToolCalls>(input: T, options: ToolCallOperationOptions = {}): T {
    const updatedToolCalls = toolCallUtilities.cancel(input.toolCalls, options);
    return { ...input, toolCalls: updatedToolCalls };
  }
}

const singleMessageUtilities = new LlmMessageUtilities();

/**
 * Utilities for working with arrays of messages
 */
class LlmMessagesUtilities {
  /**
   * Find messages with tool calls requiring approval in a message list
   * @param messages - Array of mixed messages
   * @returns Array of messages that have tool calls requiring approval
   */
  extractMessagesWithApprovalRequired<T extends WithToolCallsMessage | LlmMessageBase>(
    messages: T[],
  ): Extract<T, WithToolCallsMessage>[] {
    return messages.filter(
      (msg): msg is Extract<T, WithToolCallsMessage> =>
        msg.role === "assistant_with_tools" &&
        singleMessageUtilities.hasToolCallsRequiringApproval(msg as Extract<T, WithToolCallsMessage>),
    );
  }

  /**
   * Find messages with pending tool calls in a message list
   * @param messages - Array of mixed messages
   * @returns Array of messages that have pending tool calls
   */
  extractMessagesWithPendingToolCalls<T extends WithToolCallsMessage | LlmMessageBase>(
    messages: T[],
  ): Extract<T, WithToolCallsMessage>[] {
    return messages.filter(
      (msg): msg is Extract<T, WithToolCallsMessage> =>
        msg.role === "assistant_with_tools" &&
        singleMessageUtilities.hasPendingToolCalls(msg as Extract<T, WithToolCallsMessage>),
    );
  }

  /**
   * Find the latest message with tool calls requiring approval
   * @param messages - Array of mixed messages
   * @returns The latest message with tool calls requiring approval, or null if none found
   */
  getLatestMessageWithApprovalRequired<T extends WithToolCallsMessage | LlmMessageBase>(
    messages: T[],
  ): Extract<T, WithToolCallsMessage> | null {
    const messagesWithApproval = this.extractMessagesWithApprovalRequired(messages);
    return messagesWithApproval.length > 0 ? messagesWithApproval[messagesWithApproval.length - 1] : null;
  }

  /**
   * Approve tool calls in messages
   * @param messages - Array of mixed messages
   * @param options - Options for the operation
   * @returns New array of messages with approved tool calls
   */
  approveToolCalls<T extends WithToolCallsMessage | LlmMessageBase>(
    messages: T[],
    options: ToolCallOperationOptions = {},
  ): T[] {
    return messages.map((msg) => {
      if (msg.role === "assistant_with_tools") {
        return singleMessageUtilities.approveToolCalls(msg as Extract<T, WithToolCallsMessage>, options) as T;
      }
      return msg;
    });
  }

  /**
   * Reject tool calls in messages
   * @param messages - Array of mixed messages
   * @param options - Options for the operation
   * @returns New array of messages with rejected tool calls
   */
  rejectToolCalls<T extends WithToolCallsMessage | LlmMessageBase>(
    messages: T[],
    options: ToolCallOperationOptions = {},
  ): T[] {
    return messages.map((msg) => {
      if (msg.role === "assistant_with_tools") {
        return singleMessageUtilities.rejectToolCalls(msg as Extract<T, WithToolCallsMessage>, options) as T;
      }
      return msg;
    });
  }

  /**
   * Cancel tool calls in messages
   * @param messages - Array of mixed messages
   * @param options - Options for the operation
   * @returns New array of messages with cancelled tool calls
   */
  cancelToolCalls<T extends WithToolCallsMessage | LlmMessageBase>(
    messages: T[],
    options: ToolCallOperationOptions = {},
  ): T[] {
    return messages.map((msg) => {
      if (msg.role === "assistant_with_tools") {
        return singleMessageUtilities.cancelToolCalls(msg as Extract<T, WithToolCallsMessage>, options) as T;
      }
      return msg;
    });
  }

  /**
   * Check if an object has any pending tool calls
   * @param input - The object with tool calls
   * @returns True if any tool calls are pending execution
   */
  extractPendingToolCalls<T extends WithToolCallsMessage | LlmMessageBase>(
    input: T[],
  ): (LlmToolCall & { messageId: string })[] {
    const pendingToolCalls: (LlmToolCall & { messageId: string })[] = [];
    for (const message of messageListUtilities.extractMessagesWithPendingToolCalls(input)) {
      for (const call of toolCallUtilities.extractPending(message.toolCalls)) {
        pendingToolCalls.push({
          ...call,
          messageId: message.id ?? "",
        });
      }
    }
    return pendingToolCalls;
  }

  /**
   * Get the number of pending tool calls in a message list
   * @param messages - Array of mixed messages
   * @returns Number of pending tool calls
   */
  getNumberOfPendingToolCalls<T extends WithToolCallsMessage | LlmMessageBase>(messages: T[]): number {
    return messageListUtilities.extractPendingToolCalls(messages).length;
  }

  /**
   * Get a summary of tool call states across all messages
   * @param messages - Array of mixed messages
   * @returns Summary of tool call states
   */
  getToolCallSummary<T extends WithToolCallsMessage | LlmMessageBase>(
    messages: T[],
  ): {
    totalToolCalls: number;
    requiresApproval: number;
    approved: number;
    rejected: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    errored: number;
  } {
    const summary = {
      totalToolCalls: 0,
      requiresApproval: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      errored: 0,
    };

    messages.forEach((msg) => {
      if (msg.role === "assistant_with_tools") {
        (msg as Extract<T, WithToolCallsMessage>).toolCalls.forEach((call) => {
          summary.totalToolCalls++;

          // Count approval states
          if (call.approvalState === "requiresApproval") summary.requiresApproval++;
          else if (call.approvalState === "approved") summary.approved++;
          else if (call.approvalState === "rejected") summary.rejected++;

          // Count execution states
          if (call.executionState === "pending") summary.pending++;
          else if (call.executionState === "inProgress") summary.inProgress++;
          else if (call.executionState === "completed") summary.completed++;
          else if (call.executionState === "cancelled") summary.cancelled++;
          else if (call.executionState === "error") summary.errored++;
        });
      }
    });

    return summary;
  }
}

const messageListUtilities = new LlmMessagesUtilities();

/**
 * Utilities for working with tool calls and messages
 */
export class LlmToolKitUtilities {
  public readonly calls = toolCallUtilities;
  public readonly message = singleMessageUtilities;
  public readonly messages = messageListUtilities;
}
