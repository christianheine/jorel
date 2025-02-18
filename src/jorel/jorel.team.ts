import { z } from "zod";
import {
  LlmAgent,
  LlmAgentDefinition,
  TaskCreationError,
  TaskExecution,
  TaskExecutionDefinition,
  TaskExecutionEnvironment,
  TaskExecutionError,
  TaskExecutionThread,
} from "../agents";
import {
  generateSystemMessage,
  generateUserMessage,
  LlmAssistantMessageWithToolCalls,
  LlmToolCall,
} from "../providers";
import { generateUniqueId, Nullable } from "../shared";
import { LlmTool, LlmToolConfiguration, LlmToolKit } from "../tools";
import { JorElTaskInput } from "./jorel";
import { JorElCoreStore } from "./jorel.core";

/**
 * Manages teams of agents for JorEl
 */
export class JorElAgentManager {
  public readonly tools: LlmToolKit;
  public readonly delegateToAgentToolName = "ask_agent";
  public readonly transferToAgentToolName = "handover_to_agent";
  private readonly _agents: Map<string, LlmAgent> = new Map();

  /** @internal */
  private _core: JorElCoreStore;

  constructor(_core: JorElCoreStore) {
    this._core = _core;
    this.tools = new LlmToolKit([
      {
        name: this.delegateToAgentToolName,
        description: "Ask another agent to handle a task for you",
        params: z.object({
          agentName: z.string(),
          taskDescription: z.string({
            description: "The description of the task that you want the agent to handle",
          }),
        }),
        executor: "subTask",
      },
      {
        name: this.transferToAgentToolName,
        description: "Transfer the conversation to another agent",
        params: z.object({
          agentName: z.string(),
        }),
        executor: "transfer",
      },
    ]);
  }

  /** @internal */
  private _defaultAgentId: Nullable<string> = null;

  /**
   * Change the default agent
   * @param value
   */
  set defaultAgentId(value: Nullable<string>) {
    if (value && !this._agents.has(value)) {
      throw new Error(`Agent with name ${value} is not registered`);
    }
    this._defaultAgentId = value;
  }

  /**
   * Currently registered agents
   */
  get agents(): LlmAgent[] {
    return Array.from(this._agents.values());
  }

  /**
   * Get the default agent
   */
  get defaultAgent(): Nullable<LlmAgent> {
    return this._defaultAgentId ? (this._agents.get(this._defaultAgentId) ?? null) : null;
  }

  get logger() {
    return this._core.logger;
  }

  /**
   * Get an agent by name
   * @param name
   */
  getAgent(name: string): Nullable<LlmAgent> {
    return this._agents.get(name) || null;
  }

  /**
   * Add an agent
   * @param agent Agent instance or definition
   */
  addAgent(agent: LlmAgent | LlmAgentDefinition): LlmAgent {
    const agentInstance = agent instanceof LlmAgent ? agent : new LlmAgent(agent, this);
    if (this._agents.has(agentInstance.name)) {
      throw new Error(`Agent with name ${agentInstance.name} already exists`);
    }
    this._agents.set(agentInstance.name, agentInstance);
    if (!this._defaultAgentId) {
      this._defaultAgentId = agentInstance.name;
    }
    return agentInstance;
  }

  /**
   * Remove an agent. Will also remove the agent from the allowed delegates of other agents
   * @param agent
   */
  removeAgent(agent: LlmAgent | string): JorElAgentManager {
    const name = agent instanceof LlmAgent ? agent.name : agent;
    this._agents.delete(name);
    if (this._defaultAgentId === name) {
      this._defaultAgentId = this._agents.size > 0 ? (this._agents.keys().next().value ?? null) : null;
    }
    for (const registeredAgent of this._agents.values()) {
      registeredAgent.removeDelegate(name);
    }
    return this;
  }

  /**
   * Register tools for the agents to use (if allowed)
   * @param tools
   */
  addTools(tools: (LlmTool | LlmToolConfiguration)[] | LlmToolKit): JorElAgentManager {
    if (tools instanceof LlmToolKit) {
      this.tools.registerTools(tools.tools);
      if (tools.allowParallelCalls !== undefined) {
        this.tools.allowParallelCalls = tools.allowParallelCalls;
      }
    } else {
      this.tools.registerTools(tools);
    }
    return this;
  }

  /**
   * Hydrate a task definition into a task execution
   * If a task execution is passed, it will be returned as a copy
   * @param taskOrDefinition
   */
  hydrateTask(taskOrDefinition: TaskExecution | TaskExecutionDefinition): TaskExecution {
    return taskOrDefinition instanceof TaskExecution
      ? taskOrDefinition.copy
      : new TaskExecution(taskOrDefinition, this);
  }

  /**
   * Create a new task
   * @param task
   * @param config
   */
  async createTask(
    task: JorElTaskInput,
    config?: {
      agent?: string;
    },
  ): Promise<TaskExecution> {
    const agentId = config?.agent || this._defaultAgentId;
    if (!agentId) {
      throw new TaskCreationError("No agent specified and no default agent set");
    }

    const agent = agentId ? this.getAgent(agentId) : null;
    if (!agent) {
      throw new TaskCreationError(`Agent ${agentId} is not registered`);
    }

    return TaskExecution.fromTask(task, agent.name, this);
  }

  /**
   * Resume a task execution. Will
   * @param taskOrDefinition
   * @param env
   */
  async resumeTask(
    taskOrDefinition: TaskExecution | TaskExecutionDefinition,
    env?: Omit<TaskExecutionEnvironment, "limits">,
  ): Promise<TaskExecution> {
    const task = this.hydrateTask(taskOrDefinition);

    if (task.status === "completed" || task.status === "halted") {
      return task;
    }

    if (!task.activeThread.agent) throw new TaskExecutionError(`Agent ${task.activeThread.agentId} not found`, task.id);

    if (task.status === "pending") {
      this._core.logger.info("Team", `Starting task with agent ${task.activeThread.agent.name}`);
    } else {
      this._core.logger.verbose(
        "Team",
        `Resuming task on thread '${task.activeThread.id}' with agent ${task.activeThread.agent.name}`,
      );
    }
    this._core.logger.silly("Team", `Task`, task.definition);

    if (task.activeThread.latestMessage.role === "assistant" && task.activeThread.id === "__main__") {
      task.status = "completed";
      this._core.logger.verbose("Team", `Task completed`);
      return task;
    }

    if (task.status !== "running") task.status = "running";

    if (task.activeThread.latestMessage.role === "user") {
      return this.generateAssistantMessage(task, env);
    }

    if (task.activeThread.latestMessage.role === "assistant" && task.activeThread.id !== "__main__") {
      return this.passAssistantResultToMainThread(task);
    }

    if (
      task.activeThread.latestMessage.role === "assistant_with_tools" &&
      task.activeThread.latestMessage.toolCalls.every(
        (toolCall) => toolCall.executionState === "completed" || toolCall.executionState === "error",
      )
    ) {
      return this.generateAssistantMessage(task, env);
    }

    if (task.activeThread.latestMessage.role === "assistant_with_tools") {
      return this.processToolCalls(task, env);
    }

    return task.halt("invalidState");
  }

  /**
   * Execute a task to completion, or until stop condition is met (limit, approval, failure)
   * @param taskOrDefinition
   * @param env
   */
  async executeTask(
    taskOrDefinition: TaskExecution | TaskExecutionDefinition,
    env: TaskExecutionEnvironment,
  ): Promise<TaskExecution> {
    let task: TaskExecution = this.hydrateTask(taskOrDefinition);
    let iterations = 0;
    const { limits } = env;
    while (true) {
      iterations++;

      if (task.status === "completed" || task.status === "halted") {
        return task;
      }

      if (limits?.maxGenerations && task.stats.generations >= limits.maxGenerations) {
        this._core.logger.warn("Team", `Max generations reached`);
        return task.halt("maxGenerations");
      }

      if (limits?.maxDelegations && task.stats.delegations >= limits.maxDelegations) {
        this._core.logger.warn("Team", `Max delegations reached`);
        return task.halt("maxDelegations");
      }

      if (iterations >= (limits?.maxIterations ?? 10)) {
        this._core.logger.warn("Team", `Max iterations reached`);
        return task.halt("maxIterations");
      }

      task = await this.resumeTask(task, {
        context: env?.context,
        secureContext: env?.secureContext,
      });
    }
  }

  /**
   * Generate an assistant message (either in response to a user message or tool call results)
   * @param task
   * @param env
   * @internal
   */
  private async generateAssistantMessage(task: TaskExecution, env?: TaskExecutionEnvironment): Promise<TaskExecution> {
    if (!task.activeThread.agent) throw new TaskExecutionError(`Agent ${task.activeThread.agentId} not found`, task.id);

    const allowedToolNames = task.activeThread.agent.allowedToolNames;
    if (task.activeThread.agent.availableDelegateAgents.length > 0) allowedToolNames.push(this.delegateToAgentToolName);
    if (task.activeThread.agent.availableTransferAgents.length > 0) allowedToolNames.push(this.transferToAgentToolName);

    const response = await this._core.generate(
      [generateSystemMessage(task.activeThread.agent.systemMessage), ...task.activeThread.messages],
      {
        tools: this.tools.withAllowedToolsOnly(allowedToolNames),
        model: task.activeThread.agent.model ?? undefined,
        context: env?.context,
        secureContext: env?.secureContext,
        temperature: task.activeThread.agent.temperature ?? undefined,
        json: task.activeThread.agent.responseType === "json",
      },
    );

    task.activeThread.addEvent({
      eventType: "generation",
      timestamp: new Date().getTime(),
      messageId: response.id,
      action: `Agent ${task.activeThread.agent.name} generated ${response.role} message based on ${task.activeThread.latestMessage.role} message`,
      model: response.meta.model,
      tokenUsage: {
        input: response.meta.inputTokens ?? null,
        output: response.meta.outputTokens ?? null,
      },
    });

    this._core.logger.verbose("Team", `Completed generation step (generate response to user message)`);

    task.activeThread.addMessage(response);
    task.stats.generations++;

    return task;
  }

  /**
   * Pass the result of an assistant message with tools back to the parent thread
   * @param task
   * @internal
   */
  private async passAssistantResultToMainThread(task: TaskExecution): Promise<TaskExecution> {
    if (task.activeThread.isMain)
      throw new TaskExecutionError("Cannot return to other thread from main thread", task.id);

    const latestMessage = task.activeThread.latestMessage;
    if (!task.activeThread.agent) throw new TaskExecutionError(`Agent ${task.activeThread.agentId} not found`, task.id);

    const parentThread = task.activeThread.parentThreadId ? task.threads[task.activeThread.parentThreadId] : null;
    if (!parentThread)
      throw new TaskExecutionError(`Parent thread ${task.activeThread.parentThreadId} not found`, task.id);

    const originatingMessageIndex = parentThread.messages.findIndex(
      (m) =>
        m.role === "assistant_with_tools" && m.toolCalls.some((tc) => tc.id === task.activeThread.parentToolCallId),
    );

    if (originatingMessageIndex === -1) {
      throw new TaskExecutionError("Unable to return to parent thread. Originating tool call not found", task.id);
    }

    const message = parentThread.messages[originatingMessageIndex] as LlmAssistantMessageWithToolCalls;
    parentThread.messages[originatingMessageIndex] = {
      ...message,
      role: "assistant_with_tools",
      toolCalls: message.toolCalls.map((tc) =>
        tc.id === task.activeThread.parentToolCallId
          ? {
              id: tc.id,
              request: tc.request,
              approvalState: tc.approvalState,
              executionState: "completed",
              result: {
                conversationId: task.activeThread.id,
                message: latestMessage.content,
              },
            }
          : tc,
      ),
    };

    task.activeThread.addEvent({
      eventType: "threadChange",
      timestamp: new Date().getTime(),
      targetThreadId: parentThread.id,
      action: `Agent ${task.activeThread.agent.name} returned execution to agent ${parentThread.agent?.name ?? "unknown"} (${parentThread.isMain ? "Main" : "Sub"} thread)`,
      messageId: latestMessage.id ?? "-",
    });

    this._core.logger.info(
      "Team",
      `Returning answer from "${task.activeThread.agent.name}" to "${parentThread.agent?.name ?? "unknown"}"`,
    );

    task.activeThreadId = parentThread.id;

    this._core.logger.verbose("Team", `Changing active thread to parent thread ${parentThread.id}`);
    return task;
  }

  /**
   * Process tool calls in the assistant_with_tools message
   * @param task
   * @param env
   * @internal
   */
  private async processToolCalls(task: TaskExecution, env?: TaskExecutionEnvironment): Promise<TaskExecution> {
    const latestMessage = task.activeThread.latestMessage;
    const processedToolCalls: LlmToolCall[] = [];

    if (latestMessage.role !== "assistant_with_tools") {
      throw new TaskExecutionError("Expected assistant_with_tools message", task.id);
    }

    if (!task.activeThread.agent) {
      throw new TaskExecutionError(`Agent ${task.activeThread.agentId} not found`, task.id);
    }

    const allowedToolNames = task.activeThread.agent.allowedToolNames;
    if (task.activeThread.agent.availableDelegateAgents.length > 0) allowedToolNames.push(this.delegateToAgentToolName);
    if (task.activeThread.agent.availableTransferAgents.length > 0) allowedToolNames.push(this.transferToAgentToolName);

    const tools = this.tools.withAllowedToolsOnly(allowedToolNames);

    const preValidation = tools.classifyToolCalls(latestMessage.toolCalls);

    if (preValidation === "approvalPending") {
      task.halt("approvalRequired");
      this._core.logger.verbose("Team", `Approval required for pending tool call`);
      return task;
    }

    if (preValidation === "missingExecutor") {
      throw new TaskExecutionError("Missing executor for pending tool call", task.id);
    }

    let continueProcessing = true;
    for (let i = 0; i < latestMessage.toolCalls.length; i++) {
      const toolCall = latestMessage.toolCalls[i];

      if (toolCall.executionState === "completed" || toolCall.executionState === "error") {
        processedToolCalls.push(toolCall);
        continue;
      }

      if (!continueProcessing) {
        processedToolCalls.push(toolCall);
        continue;
      }

      const tool = tools.getTool(toolCall.request.function.name);
      if (!tool) {
        processedToolCalls.push({
          id: toolCall.id,
          request: toolCall.request,
          approvalState: toolCall.approvalState,
          executionState: "error",
          result: null,
          error: {
            type: "toolNotFound",
            lastAttempt: new Date(),
            message: `Tool not found: ${toolCall.request.function.name}`,
            numberOfAttempts: 1, // toolCall.error ? toolCall.error.numberOfAttempts + 1 : 1,
          },
        });

        task.activeThread.addEvent({
          eventType: "toolUse",
          timestamp: new Date().getTime(),
          messageId: toolCall.id,
          action: `Agent ${task.activeThread.agent.name} tried using tool ${toolCall.request.function.name}`,
          toolId: toolCall.request.function.name,
          toolArguments: toolCall.request.function.arguments,
          toolResult: null,
          toolError: `Tool not found: ${toolCall.request.function.name}`,
        });

        continue;
      }

      if (tool.type === "functionDefinition") {
        processedToolCalls.push({
          id: toolCall.id,
          request: toolCall.request,
          approvalState: toolCall.approvalState,
          executionState: "error",
          result: null,
          error: {
            type: "toolNotExecutable",
            lastAttempt: new Date(),
            message: `Tool not executable: ${tool.name}`,
            numberOfAttempts: 1, // toolCall.error ? toolCall.error.numberOfAttempts + 1 : 1,
          },
        });

        task.activeThread.addEvent({
          eventType: "toolUse",
          timestamp: new Date().getTime(),
          messageId: toolCall.id,
          action: `Agent ${task.activeThread.agent.name} tried using tool ${tool.name}`,
          toolId: toolCall.request.function.name,
          toolArguments: toolCall.request.function.arguments,
          toolResult: null,
          toolError: `Tool not executable: ${tool.name}`,
        });

        continue;
      }

      if (tool.type === "function") {
        const result = await tools.processToolCall(toolCall, {
          context: env?.context,
          secureContext: env?.secureContext,
          // retryFailed: env?.retryFailed,
        });
        processedToolCalls.push(result.toolCall);

        task.activeThread.addEvent({
          eventType: "toolUse",
          timestamp: new Date().getTime(),
          messageId: toolCall.id,
          action: `Agent ${task.activeThread.agent.name} used tool ${tool.name}`,
          toolId: toolCall.request.function.name,
          toolArguments: toolCall.request.function.arguments,
          toolResult: result.toolCall.result,
          toolError: result?.toolCall.error?.message ?? null,
        });

        if (!result.handled) {
          this._core.logger.warn("Team", `[Warning]: Tool call not handled: ${tool.name}`);
        }

        continue;
      }

      if (tool.type === "subTask") {
        if (!toolCall.request.function.arguments) {
          processedToolCalls.push({
            id: toolCall.id,
            request: toolCall.request,
            approvalState: toolCall.approvalState,
            executionState: "error",
            result: null,
            error: {
              type: "missingArguments",
              lastAttempt: new Date(),
              message: `No arguments provided for tool call ${tool.name}`,
              numberOfAttempts: 1, // toolCall.error ? toolCall.error.numberOfAttempts + 1 : 1,
            },
          });
          task.modified = true;
          continue;
        }

        if (
          typeof toolCall.request.function.arguments !== "object" ||
          !("agentName" in toolCall.request.function.arguments) ||
          typeof (toolCall.request.function.arguments as any).agentName !== "string" ||
          toolCall.request.function.arguments.agentName === "" ||
          !("taskDescription" in toolCall.request.function.arguments) ||
          typeof (toolCall.request.function.arguments as any).taskDescription !== "string" ||
          toolCall.request.function.arguments.taskDescription === ""
        ) {
          processedToolCalls.push({
            id: toolCall.id,
            request: toolCall.request,
            approvalState: toolCall.approvalState,
            executionState: "error",
            result: null,
            error: {
              type: "invalidArguments",
              lastAttempt: new Date(),
              message: `Invalid arguments provided for tool call ${tool.name} - agentName and taskDescription must be a non-empty string`,
              numberOfAttempts: 1, // toolCall.error ? toolCall.error.numberOfAttempts + 1 : 1,
            },
          });
          task.modified = true;
          continue;
        }

        const agentName = toolCall.request.function.arguments.agentName as string;
        const taskDescription = toolCall.request.function.arguments.taskDescription as string;
        const delegate = task.activeThread.agent.getDelegate(agentName);

        if (!delegate) {
          processedToolCalls.push({
            id: toolCall.id,
            request: toolCall.request,
            approvalState: toolCall.approvalState,
            executionState: "error",
            result: null,
            error: {
              type: "delegateNotAvailable",
              lastAttempt: new Date(),
              message: `Agent ${task.activeThread.agent.name} is not allowed to delegate to ${agentName}`,
              numberOfAttempts: 1, // toolCall.error ? toolCall.error.numberOfAttempts + 1 : 1,
            },
          });
          task.modified = true;
          continue;
        }

        const subThreadId = generateUniqueId();

        task.threads[subThreadId] = new TaskExecutionThread(
          {
            id: subThreadId,
            agentId: delegate.name,
            messages: [await generateUserMessage(taskDescription)],
            parentThreadId: task.activeThread.id,
            parentToolCallId: toolCall.id,
            events: [],
            modified: false,
          },
          this,
        );

        processedToolCalls.push({
          id: toolCall.id,
          request: toolCall.request,
          approvalState: toolCall.approvalState,
          executionState: "inProgress",
          result: {
            message: `Task delegated to ${delegate.name}`,
            conversationId: subThreadId,
          },
          error: null,
        });

        task.activeThread.addEvent({
          eventType: "delegation",
          timestamp: new Date().getTime(),
          messageId: toolCall.id,
          action: `Agent ${task.activeThread.agent.name} delegated to ${delegate.name}`,
          delegateToAgentName: delegate.name,
        });

        task.activeThreadId = subThreadId;
        task.stats.delegations++;
        continueProcessing = false;

        continue;
      }

      if (tool.type === "transfer") {
        if (!toolCall.request.function.arguments) {
          processedToolCalls.push({
            id: toolCall.id,
            request: toolCall.request,
            approvalState: toolCall.approvalState,
            executionState: "error",
            result: null,
            error: {
              type: "missingArguments",
              lastAttempt: new Date(),
              message: `No arguments provided for tool call ${tool.name}`,
              numberOfAttempts: 1, // toolCall.error ? toolCall.error.numberOfAttempts + 1 : 1,
            },
          });
          task.modified = true;
          continue;
        }

        if (
          typeof toolCall.request.function.arguments !== "object" ||
          !("agentName" in toolCall.request.function.arguments) ||
          typeof (toolCall.request.function.arguments as any).agentName !== "string" ||
          toolCall.request.function.arguments.agentName === ""
        ) {
          processedToolCalls.push({
            id: toolCall.id,
            request: toolCall.request,
            approvalState: toolCall.approvalState,
            executionState: "error",
            result: null,
            error: {
              type: "invalidArguments",
              lastAttempt: new Date(),
              message: `Invalid arguments provided for tool call ${tool.name} - agentName is required and must be a non-empty string`,
              numberOfAttempts: 1, // toolCall.error ? toolCall.error.numberOfAttempts + 1 : 1,
            },
          });
          task.modified = true;
          continue;
        }

        const agentName = toolCall.request.function.arguments.agentName as string;
        const delegate = task.activeThread.agent.getDelegate(agentName, "transfer");

        if (!delegate) {
          processedToolCalls.push({
            id: toolCall.id,
            request: toolCall.request,
            approvalState: toolCall.approvalState,
            executionState: "error",
            result: null,
            error: {
              type: "delegateNotAvailable",
              lastAttempt: new Date(),
              message: `Agent ${task.activeThread.agent.name} is not allowed to transfer to ${agentName}`,
              numberOfAttempts: 1, // toolCall.error ? toolCall.error.numberOfAttempts + 1 : 1,
            },
          });
          task.modified = true;
          continue;
        }

        processedToolCalls.push({
          id: toolCall.id,
          request: toolCall.request,
          approvalState: toolCall.approvalState,
          executionState: "completed",
          result: {
            message: `Transfer from ${task.activeThread.agent.name} to ${delegate.name} successful`,
          },
          error: null,
        });

        task.activeThread.addEvent({
          eventType: "transfer",
          timestamp: new Date().getTime(),
          messageId: toolCall.id,
          action: `Agent ${task.activeThread.agent.name} transferred to ${delegate.name}`,
          fromAgentName: task.activeThread.agent.name,
          toAgentName: delegate.name,
        });

        task.activeThread.agentId = delegate.name;
        continueProcessing = false;
      }
    }

    latestMessage.toolCalls = processedToolCalls;

    this._core.logger.verbose("Team", `Completed assistant with tools step`);
    return task;
  }
}
