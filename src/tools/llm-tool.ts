import {LlmFunction, LlmFunctionParameters, LlmToolExecutionInputs, LlmToolExecutionOutputs, LlmToolExecutor, MaybeUndefined} from "../shared";

export interface LlmToolConfiguration {
  name: string;
  description: string;
  requiresConfirmation?: boolean;
  executor?: LlmToolExecutor;
  params?: Partial<LlmFunctionParameters>;
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
    this.params = config.params ? this.validateParams(config.params) : undefined;
  }

  /**
   * Execute the tool
   * @param args Deserialized arguments
   */
  async execute(args: LlmToolExecutionInputs): Promise<LlmToolExecutionOutputs> {
    if (!this.executor) {
      throw new Error(`Executor not defined for tool: ${this.name}`);
    }
    return this.executor(args);
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
    const {
      type,
      properties,
      items,
      required,
      additionalProperties,
      ...rest
    } = params ?? {};
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