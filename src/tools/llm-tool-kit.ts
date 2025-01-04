import {LlmTool, LlmToolConfiguration,} from "./llm-tool";
import {LlmFunction, LlmToolCall} from "../shared";
import {dateReviver} from "../shared/date-reviver";

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
    this.tools = tools.map(tool => tool instanceof LlmTool ? tool : new LlmTool(tool));
    this.allowParallelCalls = config.allowParallelCalls ?? true;
  }

  /**
   * Whether the toolkit has any tools.
   */
  get hasTools(): boolean {
    return this.tools.length > 0;
  }

  /**
   * Get all tools as LlmFunction objects
   */
  get llmFunctions(): LlmFunction[] {
    return this.tools.map(tool => tool.toFunction());
  }

  /**
   * Register a new tool
   * @param tool Tool or tool configuration
   */
  registerTool(tool: LlmTool | LlmToolConfiguration): void {
    if (this.tools.find(t => t.name === tool.name)) {
      throw new Error(`Tool with name ${tool.name} already exists`);
    }
    this.tools.push(tool instanceof LlmTool ? tool : new LlmTool(tool));
  }

  /**
   * Unregister a tool
   * @param id Tool name
   */
  unregisterTool(id: string): void {
    const index = this.tools.findIndex(tool => tool.name === id);
    if (index === -1) throw new Error(`Tool not found: ${id}`);
    this.tools.splice(index, 1);
  }

  /**
   * Get a tool by name
   * @param id Tool name
   */
  getTool(id: string): LlmTool {
    const tool = this.tools.find(tool => tool.name === id);
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
   * Deserialize strings
   * @param input
   */
  deserialize(input: string): LlmToolCall {
    return JSON.parse(input, dateReviver);
  }

  /**
   * Serialize objects
   * @param input
   */
  serialize(input: LlmToolCall): string {
    return JSON.stringify(input);
  }

  /**
   * Process tool calls
   *
   * This method will execute the tools and return the results.
   * All tool calls must be approved or rejected before processing.
   *
   * @param input Object containing tool calls (e.g. llm "assistant_with_tools" message)
   * @param retryFailed
   * @returns Object containing tool calls with results
   * @throws Error if a tool is not found or if any tool calls still require approval
   */
  async processCalls<T extends { toolCalls: LlmToolCall[] }>(input: T, retryFailed = false): Promise<T> {
    if (input.toolCalls.some(call => call.approvalState === "requiresApproval")) {
      throw new Error("You must either approve or reject all tool calls");
    }

    const toolCalls: LlmToolCall[] = [];

    for (const call of input.toolCalls) {
      const {request, approvalState, executionState} = call;

      if (executionState === "completed") {
        toolCalls.push(call);
        continue;
      } else if (executionState === "error" && !retryFailed) {
        toolCalls.push(call);
        continue;
      }

      if (approvalState === "rejected") {
        toolCalls.push({
          request,
          approvalState: "rejected",
          executionState: "completed",
          result: {
            error: "Tool call was rejected by user"
          },
          error: null
        });
        continue;
      }

      const tool = this.tools.find(tool => tool.name === request.function.name);

      if (!tool) {
        toolCalls.push({
          request,
          approvalState,
          executionState: "error",
          result: null,
          error: {
            message: `Tool not found: ${request.function.name}`,
            type: "ToolNotFoundError",
            numberOfAttempts: call.error ? call.error.numberOfAttempts + 1 : 1,
            lastAttempt: new Date(),
          }
        });
        continue;
      }

      try {
        const result = await tool.execute(request.function.arguments);
        toolCalls.push({
          request,
          approvalState,
          executionState: "completed",
          result,
          error: null
        });
      } catch (_error: unknown) {
        const error = _error instanceof Error ? _error : new Error("Unknown error");
        toolCalls.push({
          request,
          approvalState,
          executionState: "error",
          result: null,
          error: {
            message: _error instanceof Error ? error.message : `Unable to execute tool: ${request.function.name}`,
            type: _error instanceof Error ? error.name : "ToolExecutionError",
            numberOfAttempts: call.error ? call.error.numberOfAttempts + 1 : 1,
            lastAttempt: new Date(),
          }
        });
      }
    }

    return {
      ...input,
      toolCalls,
    };
  }

  /**
   * Internal helper to approve or reject tool calls
   */
  private approveOrRejectCalls<T extends { toolCalls: LlmToolCall[] }>(input: T, approvalState: "approved" | "rejected", idOrIds?: string | string[]): T {
    const rejectedIds = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const toolCalls = input.toolCalls.map(call => {
      if (call.approvalState === "requiresApproval" && (!rejectedIds || rejectedIds.includes(call.request.id))) {
        return {...call, approvalState};
      }
      return call;
    });
    return {...input, toolCalls};
  }
}
