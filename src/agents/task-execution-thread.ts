import { Nullable } from "../shared";
import { LlmAssistantMessage, LlmAssistantMessageWithToolCalls, LlmToolCall, LlmToolCallApprovalState, LlmUserMessage } from "../providers";
import { JorElAgentManager } from "../jorel/jorel.team";
import { LlmAgent } from "./agent";
import { TaskExecutionThreadEvent } from "./task-execution-thread-event";
import { __mainTaskExecutionThreadId, TaskExecutionError } from "./task-execution";

export interface TaskExecutionThreadDefinition {
  id: string;
  agentId: string;
  messages: (LlmUserMessage | LlmAssistantMessage | LlmAssistantMessageWithToolCalls)[];
  parentThreadId: Nullable<string>;
  parentToolCallId: Nullable<string>;
  events: TaskExecutionThreadEvent[];
  modified: boolean;
}

/**
 * Represents an execution thread (messages along with the responsible agent) within a task execution
 */
export class TaskExecutionThread {
  id: string;
  agentId: string;
  messages: (LlmUserMessage | LlmAssistantMessage | LlmAssistantMessageWithToolCalls)[];
  parentThreadId: Nullable<string>;
  parentToolCallId: Nullable<string>;
  readonly events: TaskExecutionThreadEvent[];
  modified: boolean;

  private readonly jorEl: JorElAgentManager;

  /**
   * Create a new task execution thread
   * @param data
   * @param jorEl
   */
  constructor(data: TaskExecutionThreadDefinition, jorEl: JorElAgentManager) {
    this.id = data.id;
    this.agentId = data.agentId;
    this.messages = data.messages;
    this.parentThreadId = data.parentThreadId;
    this.parentToolCallId = data.parentToolCallId;
    this.events = data.events;
    this.modified = data.modified;
    this.jorEl = jorEl;
    if (this.messages.length === 0) {
      throw new TaskExecutionError("Messages cannot be an empty array", this.id);
    }
  }

  /**
   * Whether this thread is the main thread
   */
  get isMain(): boolean {
    return this.id === __mainTaskExecutionThreadId;
  }

  /**
   * Get the agent instance for this thread
   */
  get agent(): Nullable<LlmAgent> {
    return this.jorEl.getAgent(this.agentId);
  }

  /**
   * Get the last message in this thread
   */
  get latestMessage(): LlmUserMessage | LlmAssistantMessage | LlmAssistantMessageWithToolCalls {
    if (this.messages.length === 0) {
      throw new TaskExecutionError("No messages in thread", this.id);
    }
    return this.messages[this.messages.length - 1];
  }

  /**
   * Get the definition of this task execution thread
   */
  get definition(): TaskExecutionThreadDefinition {
    return {
      id: this.id,
      agentId: this.agentId,
      messages: this.messages.slice(),
      parentThreadId: this.parentThreadId,
      parentToolCallId: this.parentToolCallId,
      events: this.events,
      modified: this.modified,
    };
  }

  /**
   * Create a new instance of this thread - e.g. to avoid modifying the original
   */
  get copy(): TaskExecutionThread {
    return new TaskExecutionThread(this.definition, this.jorEl);
  }

  /**
   * Get the pending approvals for this thread
   */
  get toolCallsWithPendingApprovals(): (LlmToolCall & { messageId: string; threadId: string })[] {
    const toolCalls: (LlmToolCall & { messageId: string; threadId: string })[] = [];
    for (const message of this.messages) {
      if (message.role === "assistant_with_tools") {
        toolCalls.push(...message.toolCalls.map((toolCall) => ({ ...toolCall, messageId: message.id, threadId: this.id })));
      }
    }
    return toolCalls
  }

  /**
   * Approve or reject tool calls
   * @param messageId
   * @param toolCallIds
   * @param approvalState
   */
  public approveOrRejectToolCalls(messageId: string, toolCallIds: string[], approvalState: LlmToolCallApprovalState): void {
    let modified = false;
    this.messages.forEach((message) => {
      if (message.role === "assistant_with_tools" && message.id === messageId) {
        message.toolCalls.forEach((toolCall) => {
          if (toolCallIds.includes(toolCall.id)) {
            toolCall.approvalState = approvalState;
            modified = true;
          }
        });
      }
    });
    if (modified) {
      this.modified = true;
    }
  }

  /**
   * Add an event to this thread’s event list.
   */
  public addEvent(event: TaskExecutionThreadEvent): void {
    this.events.push(event);
    this.modified = true;
  }

  /**
   * Add a message to this thread
   * @param message
   */
  public addMessage(message: LlmUserMessage | LlmAssistantMessage | LlmAssistantMessageWithToolCalls): void {
    this.messages.push(message);
    this.modified = true;
  }
}
