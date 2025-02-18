import { generateUserMessage, LlmToolCall } from "../providers";
import { JorElAgentManager } from "../jorel/jorel.team";
import { TaskExecutionThread, TaskExecutionThreadDefinition } from "./task-execution-thread";
import { TaskExecutionThreadEvent } from "./task-execution-thread-event";
import { LLmToolContextSegment } from "../tools";
import { generateUniqueId, Nullable } from "../shared";
import { JorElTaskInput } from "../jorel";

/** Thrown when a task creation fails */
export class TaskCreationError extends Error {
  constructor(message: string) {
    super(`Task creation error: ${message}`);
  }
}

/** Thrown when a task execution fails */
export class TaskExecutionError extends Error {
  constructor(
    message: string,
    public readonly taskId: string,
  ) {
    super(`Task ${taskId}}: ${message}`);
  }
}

export type TaskExecutionStatus = "pending" | "running" | "halted" | "completed";
export type TaskExecutionHaltingReason =
  | "maxIterations"
  | "maxGenerations"
  | "maxDelegations"
  | "approvalRequired"
  | "invalidState"
  | "error"
  | "completed";

export const __mainTaskExecutionThreadId = "__main__";

export interface TaskExecutionEnvironment {
  context?: LLmToolContextSegment;
  secureContext?: LLmToolContextSegment;
  limits?: {
    maxIterations?: number;
    maxGenerations?: number;
    maxDelegations?: number;
  };
}

export interface TaskExecutionDefinition {
  id: string;
  status: TaskExecutionStatus;
  threads: {
    [threadId: string]: TaskExecutionThreadDefinition;
  };
  activeThreadId: string;
  stats: {
    generations: number;
    delegations: number;
  };
  modified: boolean;
  haltReason: Nullable<TaskExecutionHaltingReason>;
}

/**
 * Represents a task execution that manages multiple threads and their events.
 */
export class TaskExecution implements TaskExecutionDefinition {
  public readonly id: string;
  public threads: {
    [threadId: string]: TaskExecutionThread;
  };
  readonly stats: {
    generations: number;
    delegations: number;
  };
  /** @internal */
  private readonly jorEl: JorElAgentManager;

  /**
   * Create a new task execution
   * @param data - The task execution definition
   * @param jorEl - The agent manager instance
   */
  constructor(data: TaskExecutionDefinition, jorEl: JorElAgentManager) {
    this.id = data.id;
    this._status = data.status;
    this.threads = {};
    for (const threadId of Object.keys(data.threads)) {
      this.threads[threadId] = new TaskExecutionThread(data.threads[threadId], jorEl);
    }
    this._activeThreadId = data.activeThreadId;
    this.jorEl = jorEl;
    for (const thread of Object.values(this.threads)) {
      if (thread.parentThreadId) {
        if (!this.threads[thread.parentThreadId]) {
          throw new TaskExecutionError(
            `Parent thread ${thread.parentThreadId} not found (thread ${thread.id})`,
            this.id,
          );
        }
      }
      if (!this.jorEl.getAgent(thread.agentId)) {
        throw new TaskExecutionError(`Agent ${thread.agentId} not found (thread ${thread.id})`, this.id);
      }
    }
    if (!this.threads[this._activeThreadId]) {
      throw new TaskExecutionError(`Active thread ${this._activeThreadId} not found`, this.id);
    }
    this.stats = data.stats;
    this._modified = data.modified;
    this._haltReason = data.haltReason;
  }

  /** @internal */
  private _status: TaskExecutionStatus;

  /**
   * Get the task execution definition
   */
  get status(): TaskExecutionStatus {
    return this._status;
  }

  /**
   * Set the task execution status
   */
  set status(status: TaskExecutionStatus) {
    this._status = status;
    this._modified = true;
    if (status === "completed") {
      this._haltReason = "completed";
    } else if (status === "halted") {
      this._haltReason = null;
    }
  }

  /** @internal */
  private _activeThreadId: string;

  /**
   * Get the active thread ID
   */
  get activeThreadId(): string {
    return this._activeThreadId;
  }

  /**
   * Set the active thread ID
   */
  set activeThreadId(threadId: string) {
    this._activeThreadId = threadId;
    this._modified = true;
  }

  /** @internal */
  private _modified: boolean = false;

  /**
   * Whether this task execution (or any thread) has been modified
   */
  get modified(): boolean {
    return this._modified || Object.values(this.threads).some((thread) => thread.modified);
  }

  /**
   * Set the modified state of this task execution
   */
  set modified(modified: boolean) {
    this._modified = modified;
  }

  /** @internal */
  private _haltReason: Nullable<TaskExecutionHaltingReason>;

  /**
   * Get the reason for halting the task execution
   */
  get haltReason(): Nullable<TaskExecutionHaltingReason> {
    return this._haltReason;
  }

  /**
   * Set the reason for halting the task execution
   */
  set haltReason(reason: Nullable<TaskExecutionHaltingReason>) {
    this._haltReason = reason;
    this._modified = true;
  }

  /**
   * Events for this task execution along with aggregated usage statistics
   */
  public get eventsWithStatistics() {
    const events = this.getEventsByThread();
    const stats = this.stats;

    const tokens: {
      [model: string]: {
        input: number;
        output: number;
      };
    } = {};

    for (const event of events) {
      if (event.eventType === "generation") {
        if (!tokens[event.model]) {
          tokens[event.model] = {
            input: 0,
            output: 0,
          };
        }
        tokens[event.model].input += event.tokenUsage.input || 0;
        tokens[event.model].output += event.tokenUsage.output || 0;
      }
    }

    return { events, stats, tokens };
  }

  /**
   * Get the result of the task execution
   */
  get result(): Nullable<string> {
    if (!this.activeThread.isMain) return null;
    if (this.activeThread.latestMessage.role !== "assistant") return null;
    return this.activeThread.latestMessage.content;
  }

  /**
   * Get the active thread for this task execution
   */
  get activeThread(): TaskExecutionThread {
    const thread = this.threads[this._activeThreadId];
    if (!thread) {
      throw new TaskExecutionError(`Active thread ${this._activeThreadId} not found in available threads`, this.id);
    }
    return thread;
  }

  /**
   * Get the task execution definition
   */
  get definition(): TaskExecutionDefinition {
    const { id, status, _activeThreadId, stats } = this;
    const threads: {
      [threadId: string]: TaskExecutionThreadDefinition;
    } = {};
    for (const threadId of Object.keys(this.threads)) {
      threads[threadId] = this.threads[threadId].definition;
    }
    return {
      id,
      status,
      threads,
      activeThreadId: _activeThreadId,
      stats: { ...stats },
      modified: this._modified,
      haltReason: this._haltReason,
    };
  }

  /**
   * Get all events for this task execution
   */
  get events() {
    return this.getEventsByThread();
  }

  /**
   * Create a new instance of this execution - e.g. to avoid modifying the original
   */
  get copy(): TaskExecution {
    return new TaskExecution(this.definition, this.jorEl);
  }

  /**
   * Get the tool calls with pending approvals for this task execution
   */
  get toolCallsWithPendingApprovals(): (LlmToolCall & { messageId: string; threadId: string })[] {
    const toolCalls: (LlmToolCall & { messageId: string; threadId: string })[] = [];
    for (const thread of Object.values(this.threads)) {
      toolCalls.push(...thread.toolCallsWithPendingApprovals);
    }
    return toolCalls;
  }

  /**
   * Generate a new task execution from a task description
   * @param task
   * @param agentId
   * @param jorEl
   */
  static async fromTask(task: JorElTaskInput, agentId: string, jorEl: JorElAgentManager): Promise<TaskExecution> {
    return new TaskExecution(
      {
        id: generateUniqueId(),
        status: "pending",
        threads: {
          [__mainTaskExecutionThreadId]: {
            id: __mainTaskExecutionThreadId,
            agentId,
            messages: [await generateUserMessage(task)],
            parentThreadId: null,
            parentToolCallId: null,
            events: [],
            modified: false,
          },
        },
        activeThreadId: __mainTaskExecutionThreadId,
        stats: {
          generations: 0,
          delegations: 0,
        },
        modified: false,
        haltReason: null,
      },
      jorEl,
    );
  }

  /**
   * Add a follow-up user message to the main thread
   * @param message
   */
  async addFollowUpUserMessage(message: string): Promise<TaskExecution> {
    if (!this.activeThread.isMain) {
      throw new TaskExecutionError("Cannot add a message to a non-main thread", this.id);
    }
    if (this.activeThread.latestMessage.role !== "assistant") {
      throw new TaskExecutionError("The last message is not an assistant response", this.id);
    }

    const task = this.copy;

    task.activeThread.addMessage(await generateUserMessage(message));
    task.status = "running";

    return task;
  }

  /**
   * Get events by thread
   * @param threadId
   */
  public getEventsByThread(
    threadId?: string,
  ): (TaskExecutionThreadEvent & { threadId: string; parentThreadId: Nullable<string> })[] {
    const events: (TaskExecutionThreadEvent & { threadId: string; parentThreadId: Nullable<string> })[] = [];
    const threadIds = threadId ? [threadId] : Object.keys(this.threads);
    for (const threadId of threadIds) {
      const thread = this.threads[threadId];
      if (!thread) throw new Error(`Thread ${threadId} not found`);
      const parentThread = thread.parentThreadId ? this.threads[thread.parentThreadId] : null;
      for (const event of thread.events) {
        events.push({ ...event, threadId, parentThreadId: parentThread?.id ?? null });
      }
    }
    events.sort((a, b) => a.timestamp - b.timestamp);
    return events;
  }

  /**
   * Halt the task execution
   * @param reason The reason for halting the task execution.
   * Can be one of
   * - `maxIterations`:    The task execution has reached the maximum number of iterations (steps). This is useful to prevent infinite loops.
   * - `maxGenerations`:   The task execution has reached the maximum number of generations (model calls). This can be used to control the cost of the task execution.
   * - `maxDelegations`:   The task execution has reached the maximum number of delegations. This can be used to prevent excessive delegation.
   * - `approvalRequired`: The task execution contains tool-calls which requires approval.
   * - `invalidState`:     The task execution is in an invalid state.
   * - `error` :           The task execution has encountered an error.
   */
  halt(reason: TaskExecutionHaltingReason): TaskExecution {
    this.status = "halted";
    this.haltReason = reason;
    return this;
  }
}
