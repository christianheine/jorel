import { ZodObject } from "zod";
import {
  LlmFunction,
  LlmFunctionParameters,
  LlmToolExecutionInputs,
  LlmToolExecutionOutputs,
  LlmToolExecutor,
} from "../providers";
import { MaybeUndefined, zodSchemaToJsonSchema } from "../shared";

export type LLmToolContextSegment = Record<string, object | string | number | boolean | null>;

export interface LLmToolContext {
  context: LLmToolContextSegment;
  secureContext: LLmToolContextSegment;
}

export interface LlmToolConfiguration {
  name: string;
  description: string;
  requiresConfirmation?: boolean;
  executor?: LlmToolExecutor | "transfer" | "subTask";
  params?: Partial<LlmFunctionParameters> | ZodObject<any>;
}

/**
 * A tool that can be used in generations and task executions
 */
export class LlmTool {
  public readonly name: string;
  public readonly description: string;
  public requiresConfirmation;

  /** @internal */
  private readonly params: MaybeUndefined<LlmFunctionParameters>;

  /** @internal */
  private readonly executor: MaybeUndefined<LlmToolExecutor | "transfer" | "subTask">;

  constructor(config: LlmToolConfiguration) {
    this.requiresConfirmation = config.requiresConfirmation ?? false;
    this.name = config.name;
    this.description = config.description;
    this.executor = config.executor;
    this.params = !config.params
      ? undefined
      : config.params instanceof ZodObject
        ? zodSchemaToJsonSchema(config.params)
        : this.validateParams(config.params);
  }

  /**
   * Get the type of the tool
   */
  get type(): "function" | "functionDefinition" | "transfer" | "subTask" {
    return this.executor === "transfer" || this.executor === "subTask"
      ? this.executor
      : this.executor
        ? "function"
        : "functionDefinition";
  }

  /**
   * Return the tool as a llm function (e.g., for use inside tool-use messages)
   */
  get asLLmFunction(): LlmFunction {
    return {
      type: "function",
      function: {
        name: this.name,
        description: this.description,
        parameters: this.params,
      },
    };
  }

  /**
   * Execute the tool
   * @param args Deserialized arguments
   * @param env
   * @param env.context Contextual data (included in logs)
   * @param env.secureContext Secure contextual data (excluded from logs)
   */
  async execute(args: LlmToolExecutionInputs, env: Partial<LLmToolContext> = {}): Promise<LlmToolExecutionOutputs> {
    if (!this.executor) {
      throw new Error(`Executor not defined for tool: ${this.name}`);
    }

    if (this.executor === "transfer" || this.executor === "subTask") {
      throw new Error(`Cannot execute tool "${this.name}". ${this.executor} tools cannot be executed directly.`);
    }

    return this.executor(args, env.context || {}, env.secureContext || {});
  }

  /**
   * Internal helper to validate and normalize parameters
   * @param params
   */
  private validateParams(params: Partial<LlmFunctionParameters>): LlmFunctionParameters {
    const { type, properties, items, required, additionalProperties, ...rest } = params ?? {};
    return {
      type: type ? type : items ? "array" : properties ? "object" : "string",
      required: required ?? [],
      items,
      additionalProperties: additionalProperties ?? false,
      properties,
      ...rest,
    };
  }
}
