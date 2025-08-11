import { LogService } from "../logger";
import {
  generateAssistantMessage,
  InitLlmGenerationConfig,
  LlmMessage,
  LlmStreamResponse,
  LlmStreamResponseChunk,
  LlmStreamResponseMessages,
  LlmStreamResponseWithToolCalls,
  LlmStreamToolCallCompleted,
  LlmStreamToolCallStarted,
  LlmToolCall,
} from "../providers";
import { getModelOverrides } from "../providers/get-overrides";
import { modelParameterOverrides } from "../providers/model-parameter-overrides";
import { maskAll, MaybeUndefined, omit, shallowFilterUndefined } from "../shared";
import { JorElGenerationConfigWithTools, JorElGenerationOutput } from "./jorel";
import { JorElModelManager, ModelEntry } from "./jorel.models";
import { JorElProviderManager } from "./jorel.providers";

export class JorElCoreStore {
  defaultConfig: InitLlmGenerationConfig = {};
  logger: LogService;

  providerManager: JorElProviderManager;
  modelManager: JorElModelManager;

  constructor(config: InitLlmGenerationConfig = {}) {
    this.defaultConfig = config;
    if (config.logger instanceof LogService) {
      this.logger = config.logger;
      if (config.logLevel) {
        this.logger.logLevel = config.logLevel;
      }
    } else {
      this.logger = this.logger = new LogService(config.logger, config.logLevel);
    }
    this.providerManager = new JorElProviderManager(this.logger);
    this.modelManager = new JorElModelManager(this.logger);
    this.logger.debug("Core", "Core store initialized");
    this.logger.silly("Core", "Core store config", {
      config: omit(config, ["logger"]),
    });
  }

  /**
   * Applies model-specific defaults and overrides to messages and config
   * @param messages - The messages to apply the defaults and overrides to
   * @param config - The config to apply the defaults and overrides to
   * @param modelEntry - The model entry to apply (with potential defaults)
   */
  private applyModelDefaultsAndOverrides(
    messages: LlmMessage[],
    config: JorElGenerationConfigWithTools,
    modelEntry: ModelEntry,
  ): { messages: LlmMessage[]; config: JorElGenerationConfigWithTools } {
    const overrides = getModelOverrides(modelEntry.model, modelParameterOverrides);

    if (overrides.noSystemMessage && messages.some((m) => m.role === "system")) {
      this.logger.debug("Core", `System messages are not supported for ${modelEntry.model} and will be ignored`);
    }

    if (overrides.noTemperature && typeof config.temperature === "number") {
      this.logger.debug("Core", `Temperature is not supported for ${modelEntry.model} and will be ignored`);
    }

    return {
      messages: overrides.noSystemMessage ? messages.filter((m) => m.role !== "system") : messages,
      config: shallowFilterUndefined({
        ...config,
        temperature: overrides.noTemperature ? null : config.temperature || modelEntry.defaults?.temperature,
        reasoningEffort: config.reasoningEffort || modelEntry.defaults?.reasoningEffort,
        verbosity: config.verbosity || modelEntry.defaults?.verbosity,
      }),
    };
  }

  /**
   * Generate a response for a given set of messages
   * @param messages - The messages to generate a response for
   * @param config - The config to use for this generation
   * @param config.model - Model to use for this generation (optional)
   * @param config.systemMessage - System message to include in this request (optional)
   * @param config.temperature - Temperature for this request (optional)
   * @param config.tools - Tools to use for this request (optional)
   */
  async generate(messages: LlmMessage[], config: JorElGenerationConfigWithTools = {}): Promise<JorElGenerationOutput> {
    const modelEntry = this.modelManager.getModel(config.model || this.modelManager.getDefaultModel());
    const provider = this.providerManager.getProvider(modelEntry.provider);

    const { messages: messagesWithOverrides, config: configWithOverrides } = this.applyModelDefaultsAndOverrides(
      messages,
      config,
      modelEntry,
    );

    this.logger.debug(
      "Core",
      `Starting to generate response with model ${modelEntry.model} and provider ${modelEntry.provider}`,
    );
    this.logger.silly("Core", `Generate inputs`, {
      model: modelEntry.model,
      provider: modelEntry.provider,
      messagesWithOverrides,
      ...omit(configWithOverrides, ["secureContext"]),
      secureContext: config.secureContext ? maskAll(config.secureContext) : undefined,
    });

    const response = await provider.generateResponse(modelEntry.model, messagesWithOverrides, {
      ...this.defaultConfig,
      ...configWithOverrides,
      logger: this.logger,
    });
    this.logger.debug(
      "Core",
      `Finished generating response in ${response.meta.durationMs}ms. ${response.meta.inputTokens} input tokens, ${response.meta.outputTokens} output tokens`,
    );
    this.logger.silly("Core", "Generate output", {
      response,
    });
    return response;
  }

  /**
   * Internal method to generate a response and process tool calls until a final response is generated
   * @param messages - The messages to generate a response for
   * @param config - The config to use for this generation
   * @param autoApprove - Whether to auto-approve tool calls
   */
  async generateAndProcessTools(
    messages: LlmMessage[],
    config: JorElGenerationConfigWithTools = {},
    autoApprove = false,
  ): Promise<{ output: JorElGenerationOutput; messages: LlmMessage[] }> {
    const _messages = [...messages];
    if (config.tools && config.tools.tools.some((t) => t.type !== "function")) {
      throw new Error("Only tools with a function executor can be used in this context");
    }

    const maxToolCalls = config.maxToolCalls || 5;
    const maxToolCallErrors = config.maxToolCallErrors || 3;

    const maxAttempts = Math.max(maxToolCalls, maxToolCallErrors);

    let toolCallErrors = 0;
    let toolCalls = 0;

    let generation: MaybeUndefined<JorElGenerationOutput>;
    for (let i = 0; i < maxAttempts; i++) {
      generation = await this.generate(_messages, config);
      if (generation.role === "assistant" || !config.tools) {
        break;
      } else {
        generation = autoApprove ? config.tools.approveCalls(generation) : generation;
        this.logger.debug("Core", `Starting to process tool calls`);
        this.logger.silly("Core", `Tool call inputs`, {
          generation,
          autoApprove,
          context: config.context,
          secureContext: config.secureContext ? maskAll(config.secureContext) : undefined,
        });
        generation = await config.tools.processCalls(generation, {
          context: config.context,
          secureContext: config.secureContext,
          maxErrors: Math.max(0, maxToolCallErrors - toolCallErrors),
          maxCalls: Math.max(0, maxToolCalls - toolCalls),
        });
        toolCalls += generation.toolCalls.length;
        toolCallErrors += generation.toolCalls.filter((t) => t.executionState === "error").length;
        this.logger.debug("Core", `Finished processing tool calls`);
        this.logger.silly("Core", `Tool call outputs`, {
          generation,
        });
        _messages.push(generateAssistantMessage(generation.content, generation.toolCalls));
      }
    }

    if (!generation) {
      throw new Error("Unable to generate a response");
    }

    _messages.push(generateAssistantMessage(generation.content));

    return {
      output: generation,
      messages: _messages,
    };
  }

  /**
   * Generate a stream of response chunks for a given set of messages
   * @param messages - The messages to generate a response for
   * @param config - The config to use for this generation
   */
  async *generateContentStream(
    messages: LlmMessage[],
    config: JorElGenerationConfigWithTools = {},
  ): AsyncGenerator<LlmStreamResponseChunk | LlmStreamResponse | LlmStreamResponseWithToolCalls, void, unknown> {
    const modelEntry = this.modelManager.getModel(config.model || this.modelManager.getDefaultModel());
    const provider = this.providerManager.getProvider(modelEntry.provider);

    const { messages: messagesWithOverrides, config: configWithOverrides } = this.applyModelDefaultsAndOverrides(
      messages,
      config,
      modelEntry,
    );

    this.logger.debug(
      "Core",
      `Starting to generate response stream with model ${modelEntry.model} and provider ${modelEntry.provider}`,
    );
    this.logger.silly("Core", `Response stream inputs`, {
      model: modelEntry.model,
      provider: modelEntry.provider,
      messages: messagesWithOverrides,
      ...omit(configWithOverrides, []),
    });

    const stream = provider.generateResponseStream(modelEntry.model, messagesWithOverrides, {
      ...this.defaultConfig,
      ...configWithOverrides,
      logger: this.logger,
    });

    for await (const chunk of stream) {
      if (chunk.type === "toolCallStarted" || chunk.type === "toolCallCompleted") {
        // Do nothing
      } else {
        yield chunk;
      }

      if (chunk.type === "response") {
        this.logger.debug("Core", "Finished generating response stream");
        this.logger.silly("Core", "Response stream output", {
          chunk,
        });
      }
    }
  }

  /**
   * Generate a stream of response chunks for a given set of messages and process tool calls until a final response is generated
   * @param messages - The messages to generate a response for
   * @param config - The config to use for this generation
   * @param autoApprove - Whether to auto-approve tool calls
   */
  async *generateStreamAndProcessTools(
    messages: LlmMessage[],
    config: JorElGenerationConfigWithTools = {},
    autoApprove = false,
  ): AsyncGenerator<
    | LlmStreamResponseChunk
    | LlmStreamResponse
    | LlmStreamResponseWithToolCalls
    | LlmStreamResponseMessages
    | LlmStreamToolCallStarted
    | LlmStreamToolCallCompleted,
    void,
    unknown
  > {
    if (config.tools && config.tools.tools.some((t) => t.type !== "function")) {
      throw new Error("Only tools with a function executor can be used in this context");
    }

    const maxToolCalls = config.maxToolCalls || 5;
    const maxToolCallErrors = config.maxToolCallErrors || 3;

    const maxAttempts = Math.max(maxToolCalls, maxToolCallErrors);

    let toolCallErrors = 0;
    let toolCalls = 0;

    let response: MaybeUndefined<LlmStreamResponse | LlmStreamResponseWithToolCalls> = undefined;
    for (let i = 0; i < maxAttempts; i++) {
      const stream = this.generateContentStream(messages, config);

      for await (const chunk of stream) {
        if (chunk.type === "chunk") {
          yield chunk;
        } else {
          response = chunk;
        }
      }

      if (!response) throw new Error("Unable to generate a response");
      if (response.role === "assistant" || !config.tools) break;

      response = autoApprove ? config.tools.approveCalls(response) : response;

      this.logger.debug("Core", "Processing tool calls");

      // Emit tool call started events for each tool call
      for (const toolCall of response.toolCalls) {
        yield {
          type: "toolCallStarted",
          toolCall: {
            id: toolCall.id,
            executionState: "pending",
            approvalState: toolCall.approvalState,
            request: toolCall.request,
            result: null,
          },
        };
      }

      const processedToolCalls: LlmToolCall[] = [];

      for (const toolCall of response.toolCalls) {
        if (toolCallErrors >= maxToolCallErrors) {
          this.setCallToError(toolCall, "Too many tool call errors");
          processedToolCalls.push(toolCall);
          continue;
        }

        if (toolCalls >= maxToolCalls) {
          this.setCallToError(toolCall, "Too many tool calls");
          processedToolCalls.push(toolCall);
          continue;
        }

        if (toolCall.executionState !== "pending") {
          continue;
        }

        const result = await config.tools.processToolCall(toolCall, {
          context: config.context,
          secureContext: config.secureContext,
        });

        processedToolCalls.push(result.toolCall);

        if (result.toolCall.executionState === "completed" || result.toolCall.executionState === "error") {
          yield {
            type: "toolCallCompleted",
            toolCall: result.toolCall,
          };
        }

        if (result.toolCall.executionState === "error") {
          toolCallErrors++;
        }

        toolCalls++;
      }

      response = {
        ...response,
        toolCalls: processedToolCalls,
      };

      this.logger.debug("Core", "Finished processing tool calls");

      messages.push(generateAssistantMessage(response.content, response.toolCalls));
    }

    if (response) {
      yield response;
      messages.push(generateAssistantMessage(response.content));
    }

    yield {
      type: "messages",
      messages,
    };
  }

  /**
   * Helper method to set a tool call to error state
   */
  private setCallToError(toolCall: LlmToolCall, errorMessage: string): void {
    toolCall.executionState = "error";
    toolCall.error = {
      type: "ToolExecutionError",
      message: errorMessage,
      numberOfAttempts: 1,
      lastAttempt: new Date(),
    };
    toolCall.result = null;
  }

  /**
   * Generate an embedding for a given text
   * @param text - The text to generate an embedding for
   * @param model - The model to use for this generation (optional)
   */
  async generateEmbedding(text: string, model?: string) {
    const modelEntry = this.modelManager.getEmbeddingModel(model || this.modelManager.getDefaultEmbeddingModel());
    const provider = this.providerManager.getProvider(modelEntry.provider);
    this.logger.debug(
      "Core",
      `Generating embedding with model ${modelEntry.model} and provider ${modelEntry.provider}`,
    );
    this.logger.silly("Core", `Embedding inputs`, {
      model: modelEntry.model,
      provider: modelEntry.provider,
      text,
    });
    return await provider.createEmbedding(modelEntry.model, text);
  }
}
