import { LlmFunction, LlmToolCall } from "../providers";
import { dateReviver, MaybeUndefined, Nullable } from "../shared";
import { LlmTool, LlmToolConfiguration, LLmToolContextSegment } from "./llm-tool";
import { LlmToolKitUtilities } from "./utilities";

/**
 * A toolkit for managing one or more LLM tools.
 */
export class LlmToolKit {
  public readonly tools: LlmTool[];
  public allowParallelCalls: boolean;

  public static readonly utilities = new LlmToolKitUtilities();

  /**
   * Allow access from the instance as well
   */
  get utilities(): LlmToolKitUtilities {
    return LlmToolKit.utilities;
  }

  constructor(
    tools: (LlmTool | LlmToolConfiguration)[],
    config: {
      allowParallelCalls?: boolean;
    } = {},
  ) {
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
  get asLlmFunctions(): MaybeUndefined<LlmFunction[]> {
    if (this.tools.length === 0) return undefined;
    return this.tools.map((tool) => tool.asLLmFunction);
  }

  /**
   * Deserialize strings
   * @param input
   */
  static deserialize(input: string): object {
    return JSON.parse(input, dateReviver);
  }

  /**
   * Serialize objects
   * @param input
   */
  static serialize(input: object): string {
    return JSON.stringify(input);
  }

  /**
   * Create a new toolkit with only selected (allowed) tools
   * @param allowedToolIds
   */
  withAllowedToolsOnly(allowedToolIds: string[]): LlmToolKit {
    return new LlmToolKit(
      this.tools.filter((tool) => allowedToolIds.includes(tool.name)),
      {
        allowParallelCalls: this.allowParallelCalls,
      },
    );
  }

  /**
   * Get the next tool call that requires processing
   * @param input
   */
  getNextToolCall(input: LlmToolCall[]): Nullable<{ toolCall: LlmToolCall; tool: LlmTool }> {
    const toolCall =
      input.find((call) => call.executionState === "pending" || call.executionState === "inProgress") || null;
    if (!toolCall) return null;
    const tool = this.getTool(toolCall.request.function.name);
    if (!tool) {
      throw new Error(`Tool not found: ${toolCall.request.function.name}`);
    }
    return { toolCall, tool };
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
    if (this.tools[index].type === "transfer" || this.tools[index].type === "subTask") {
      throw new Error(`Cannot unregister tool "${id}". ${this.tools[index].type} tools cannot be unregistered.`);
    }
    this.tools.splice(index, 1);
  }

  /**
   * Get a tool by name
   * @param id Tool name
   */
  getTool(id: string): Nullable<LlmTool> {
    return this.tools.find((tool) => tool.name === id) ?? null;
  }

  /**
   * Classify what type of tool calls are present. This implementation goes beyond the basic classification inside
   * the toolkit utilities to provide more detailed information, such as pending transfers and missing executors
   * which require access to the tool instances
   * @param toolCalls
   */
  classifyToolCalls(
    toolCalls: LlmToolCall[],
  ): "approvalPending" | "transferPending" | "executionPending" | "completed" | "missingExecutor" {
    if (toolCalls.some((call) => call.approvalState === "requiresApproval")) {
      return "approvalPending";
    }
    if (
      toolCalls.some((call) => {
        const tool = this.getTool(call.request.function.name);
        if (!tool) {
          throw new Error(`Tool not found: ${call.request.function.name}`);
        }
        return (
          tool.type === "functionDefinition" &&
          (call.executionState === "pending" || call.executionState === "inProgress")
        );
      })
    ) {
      return "missingExecutor";
    }
    if (
      toolCalls.some((call) => {
        const tool = this.getTool(call.request.function.name);
        if (!tool) {
          throw new Error(`Tool not found: ${call.request.function.name}`);
        }
        return (
          (tool.type === "transfer" || tool.type === "subTask") &&
          (call.executionState === "pending" || call.executionState === "inProgress")
        );
      })
    ) {
      return "transferPending";
    }
    if (toolCalls.some((call) => call.executionState === "pending" || call.executionState === "inProgress")) {
      return "executionPending";
    }
    return "completed";
  }

  /**
   * Process a single tool call and return the updated tool call
   * @param toolCall
   * @param config
   * @returns Object containing the updated tool call and a boolean indicating whether the tool call was handled
   * If the tool call was not handled, it requires additional processing (e.g. approval or delegation)
   */
  async processToolCall(
    toolCall: LlmToolCall,
    config?: {
      retryFailed?: boolean;
      context?: LLmToolContextSegment;
      secureContext?: LLmToolContextSegment;
    },
  ): Promise<{
    toolCall: LlmToolCall;
    handled: boolean;
  }> {
    const { id, request, approvalState, executionState } = toolCall;

    if (approvalState === "requiresApproval") {
      return { toolCall, handled: false };
    }

    if (executionState === "completed") {
      return { toolCall, handled: true };
    } else if (executionState === "error" && !config?.retryFailed) {
      return { toolCall, handled: true };
    } else if (executionState === "inProgress") {
      return { toolCall, handled: false };
    }

    if (approvalState === "rejected") {
      return {
        toolCall: {
          id,
          request,
          approvalState: "rejected",
          executionState: "completed",
          result: {
            error: "Tool call was rejected by user",
          },
          error: null,
        },
        handled: true,
      };
    }

    const tool = this.tools.find((tool) => tool.name === request.function.name);

    if (!tool) {
      return {
        toolCall: {
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
        },
        handled: true,
      };
    }

    if (tool.type !== "function") {
      return { toolCall, handled: false };
    }

    try {
      const result = await tool.execute(request.function.arguments, {
        context: config?.context,
        secureContext: config?.secureContext,
      });

      return {
        toolCall: {
          id,
          request,
          approvalState,
          executionState: "completed",
          result,
          error: null,
        },
        handled: true,
      };
    } catch (_error: unknown) {
      const error = _error instanceof Error ? _error : new Error("Unknown error");

      return {
        toolCall: {
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
        },
        handled: true,
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
      maxErrors?: number;
      maxCalls?: number;
    },
  ): Promise<T> {
    let errors = 0;
    let calls = 0;

    if (!input.toolCalls) return input;
    const classification = this.classifyToolCalls(input.toolCalls);
    if (classification === "transferPending") {
      throw new Error("Transfer tools cannot be processed by this method");
    }

    const toolCalls: LlmToolCall[] = [];
    for (const call of input.toolCalls) {
      if (call.executionState === "completed" || (call.executionState === "error" && !config?.retryFailed)) {
        toolCalls.push(call);
      } else if (call.executionState === "cancelled") {
        toolCalls.push(call);
      } else if (errors >= (config?.maxErrors ?? 5)) {
        const message = "Too many tool call errors";
        toolCalls.push({
          ...call,
          executionState: "cancelled",
          result: null,
          error: {
            message,
            type: "ToolExecutionError",
            numberOfAttempts: call.error ? call.error.numberOfAttempts + 1 : 1,
            lastAttempt: new Date(),
          },
        });
      } else if (calls >= (config?.maxCalls ?? 8)) {
        const message = "Too many tool calls";
        toolCalls.push({
          ...call,
          executionState: "cancelled",
          result: null,
          error: {
            message,
            type: "ToolExecutionError",
            numberOfAttempts: call.error ? call.error.numberOfAttempts + 1 : 1,
            lastAttempt: new Date(),
          },
        });
      } else if (classification === "missingExecutor") {
        const message = "Unable to execute tool";
        toolCalls.push({
          ...call,
          executionState: "cancelled",
          result: null,
          error: {
            message,
            type: "ToolExecutionError",
            numberOfAttempts: call.error ? call.error.numberOfAttempts + 1 : 1,
            lastAttempt: new Date(),
          },
        });
      } else {
        const { toolCall } = await this.processToolCall(call, config);
        toolCalls.push(toolCall);
        if (toolCall.error) {
          errors++;
        }
        calls++;
      }
    }

    return {
      ...input,
      toolCalls,
    };
  }
}
