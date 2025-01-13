import {
  LlmFunction,
  LlmFunctionParameters,
  LlmToolExecutionInputs,
  LlmToolExecutionOutputs,
  LlmToolExecutor,
  MaybeUndefined,
} from "../shared";
import { ZodObject } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export type LLmToolContextSegment = Record<string, object | string | number | boolean | null>;

export interface LLmToolContext {
  context: LLmToolContextSegment;
  secureContext: LLmToolContextSegment;
}

export interface LlmToolConfiguration {
  name: string;
  description: string;
  requiresConfirmation?: boolean;
  executor?: LlmToolExecutor;
  params?: Partial<LlmFunctionParameters> | ZodObject<any>;
}

export class LlmTool {
  public readonly name: string;
  public readonly description: string;
  public requiresConfirmation;

  private readonly params: MaybeUndefined<LlmFunctionParameters>;
  private readonly executor: MaybeUndefined<LlmToolExecutor>;

  constructor(config: LlmToolConfiguration) {
    this.requiresConfirmation = config.requiresConfirmation ?? false;
    this.name = config.name;
    this.description = config.description;
    this.executor = config.executor;
    this.params = !config.params
      ? undefined
      : config.params instanceof ZodObject
        ? zodToJsonSchema(config.params, { target: "openAi" })
        : this.validateParams(config.params);
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
    return this.executor(args, env.context || {}, env.secureContext || {});
  }

  /**
   * Return the tool as a function
   */
  toFunction(): LlmFunction {
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
   * Internal helper to validate and normalize parameters
   * @param params
   * @private
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
