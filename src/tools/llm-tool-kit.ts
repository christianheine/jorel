import { LlmTool, LlmToolConfiguration, LLmToolContextSegment } from "./llm-tool";
import { dateReviver, LlmFunction, LlmToolCall } from "../shared";

interface LlmToolKitConfiguration {
  allowParallelCalls?: boolean;
}

/**
 * A toolkit for managing one or more LLM tools.
 */
export class LlmToolKit {
  public readonly tools: LlmTool[];
  public allowParallelCalls: boolean;

  constructor(tools: (LlmTool | LlmToolConfiguration)[], config: LlmToolKitConfiguration = {}) {
    this.tools = tools.map((tool) => (tool instanceof LlmTool ? tool : new LlmTool(tool)));
    this.allowParallelCalls = config.allowParallelCalls ?? true;
  }

  /**
   * Whether the toolkit has any tools
   */
  get hasTools(): boolean {
    return this.tools.length > 0;
  }

  /**
   * Get all tools as LlmFunction objects
   */
  get llmFunctions(): LlmFunction[] {
    return this.tools.map((tool) => tool.toFunction());
  }

  /**
   * Deserialize strings
   * @param input
   */
  static deserialize(input: string): LlmToolCall {
    return JSON.parse(input, dateReviver);
  }

  /**
   * Serialize objects
   * @param input
   */
  static serialize(input: LlmToolCall): string {
    return JSON.stringify(input);
  }

  static getNextToolCall(input: LlmToolCall[]): LlmToolCall | null {
    return input.find((call) => call.executionState === "pending" || call.executionState === "inProgress") || null;
  }

  /**
   * Register one or more tools
   * @param tools
   */
  registerTools(tools: (LlmTool | LlmToolConfiguration)[]): void {
    for (const tool of tools) {
      if (this.tools.find((t) => t.name === tool.name)) {
        throw new Error(`A tool with name ${tool.name} already exists`);
      }
    }
    this.tools.push(...tools.map((tool) => (tool instanceof LlmTool ? tool : new LlmTool(tool))));
  }

  /**
   * Register a new tool
   * @param tool Tool or tool configuration
   */
  registerTool(tool: LlmTool | LlmToolConfiguration): void {
    if (this.tools.find((t) => t.name === tool.name)) {
      throw new Error(`A tool with name ${tool.name} already exists`);
    }
    this.tools.push(tool instanceof LlmTool ? tool : new LlmTool(tool));
  }

  /**
   * Unregister a tool
   * @param id Tool name
   */
  unregisterTool(id: string): void {
    const index = this.tools.findIndex((tool) => tool.name === id);
    if (index === -1) throw new Error(`Tool not found: ${id}`);
    this.tools.splice(index, 1);
  }

  /**
   * Get a tool by name
   * @param id Tool name
   */
  getTool(id: string): LlmTool {
    const tool = this.tools.find((tool) => tool.name === id);
    if (!tool) throw new Error(`Tool not found: ${id}`);
    return tool;
  }

  /**
   * Reject one or more tool calls
   * @param input Object containing tool calls (e.g. llm "assistant_with_tools" message)
   * @param idOrIds ID or array of IDs of tool calls to reject. If not provided, all tool calls will be rejected.
   */
  rejectCalls<T extends { toolCalls: LlmToolCall[] }>(input: T, idOrIds?: string | string[]): T {
    return this.approveOrRejectCalls(input, "rejected", idOrIds);
  }

  /**
   * Approve one or more tool calls
   * @param input Object containing tool calls (e.g. llm "assistant_with_tools" message)
   * @param idOrIds ID or array of IDs of tool calls to approve. If not provided, all tool calls will be approved.
   */
  approveCalls<T extends { toolCalls: LlmToolCall[] }>(input: T, idOrIds?: string | string[]): T {
    return this.approveOrRejectCalls(input, "approved", idOrIds);
  }

  /**
   * Process a single tool call and return the updated tool call
   * @param toolCall
   * @param config
   * @returns Updated tool call
   */
  async processToolCall(
    toolCall: LlmToolCall,
    config?: {
      retryFailed?: boolean;
      context?: LLmToolContextSegment;
      secureContext?: LLmToolContextSegment;
    },
  ): Promise<LlmToolCall> {
    const { id, request, approvalState, executionState } = toolCall;

    if (approvalState === "requiresApproval") {
      return toolCall;
    }

    if (executionState === "completed") {
      return toolCall;
    } else if (executionState === "error" && !config?.retryFailed) {
      return toolCall;
    }

    if (approvalState === "rejected") {
      return {
        id,
        request,
        approvalState: "rejected",
        executionState: "completed",
        result: {
          error: "Tool call was rejected by user",
        },
        error: null,
      };
    }

    const tool = this.tools.find((tool) => tool.name === request.function.name);

    if (!tool) {
      return {
        id,
        request,
        approvalState,
        executionState: "error",
        result: null,
        error: {
          message: `Tool not found: ${request.function.name}`,
          type: "ToolNotFoundError",
          numberOfAttempts: toolCall.error ? toolCall.error.numberOfAttempts + 1 : 1,
          lastAttempt: new Date(),
        },
      };
    }

    try {
      const result = await tool.execute(request.function.arguments, {
        context: config?.context,
        secureContext: config?.secureContext,
      });

      return {
        id,
        request,
        approvalState,
        executionState: "completed",
        result,
        error: null,
      };
    } catch (_error: unknown) {
      const error = _error instanceof Error ? _error : new Error("Unknown error");

      return {
        id,
        request,
        approvalState,
        executionState: "error",
        result: null,
        error: {
          message: _error instanceof Error ? error.message : `Unable to execute tool: ${request.function.name}`,
          type: _error instanceof Error ? error.name : "ToolExecutionError",
          numberOfAttempts: toolCall.error ? toolCall.error.numberOfAttempts + 1 : 1,
          lastAttempt: new Date(),
        },
      };
    }
  }

  /**
   * Process tool calls
   *
   * This method will execute the tools and return the results.
   * All tool calls must be approved or rejected before processing.
   *
   * @param input Object containing tool calls (e.g. llm "assistant_with_tools" message)
   * @param config
   * @returns Object containing tool calls with results
   * @throws Error if a tool is not found or if any tool calls still require approval
   */
  async processCalls<T extends { toolCalls?: LlmToolCall[] }>(
    input: T,
    config?: {
      retryFailed?: boolean;
      context?: LLmToolContextSegment;
      secureContext?: LLmToolContextSegment;
    },
  ): Promise<T> {
    if (!input.toolCalls) return input;
    const toolCalls: LlmToolCall[] = [];
    for (const call of input.toolCalls) toolCalls.push(await this.processToolCall(call, config));
    return {
      ...input,
      toolCalls,
    };
  }

  /**
   * Internal helper to approve or reject tool calls
   */
  private approveOrRejectCalls<T extends { toolCalls: LlmToolCall[] }>(
    input: T,
    approvalState: "approved" | "rejected",
    idOrIds?: string | string[],
  ): T {
    const rejectedIds = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const toolCalls = input.toolCalls.map((call) => {
      if (call.approvalState === "requiresApproval" && (!rejectedIds || rejectedIds.includes(call.request.id))) {
        return { ...call, approvalState };
      }
      return call;
    });
    return { ...input, toolCalls };
  }
}
