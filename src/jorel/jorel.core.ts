import { LogService } from "../logger";
import {
  CoreLlmMessage,
  generateAssistantMessage,
  InitLlmGenerationConfig,
  LlmStreamResponse,
  LlmStreamResponseChunk,
  LlmStreamResponseMessages,
  LlmStreamResponseWithToolCalls,
  LlmStreamToolCallCompleted,
  LlmStreamToolCallStarted,
} from "../providers";
import { maskAll, MaybeUndefined, omit } from "../shared";
import { JorElGenerationConfigWithTools, JorElGenerationOutput } from "./jorel";
import { JorElModelManager } from "./jorel.models";
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
   * Generate a response for a given set of messages
   * @param messages
   * @param config
   * @param config.model Model to use for this generation (optional)
   * @param config.systemMessage System message to include in this request (optional)
   * @param config.temperature Temperature for this request (optional)
   * @param config.tools Tools to use for this request (optional)
   */
  async generate(
    messages: CoreLlmMessage[],
    config: JorElGenerationConfigWithTools = {},
  ): Promise<JorElGenerationOutput> {
    const modelEntry = this.modelManager.getModel(config.model || this.modelManager.getDefaultModel());
    const provider = this.providerManager.getProvider(modelEntry.provider);
    this.logger.debug(
      "Core",
      `Starting to generate response with model ${modelEntry.model} and provider ${modelEntry.provider}`,
    );
    this.logger.silly("Core", `Generate inputs`, {
      model: modelEntry.model,
      provider: modelEntry.provider,
      messages,
      ...omit(config, ["secureContext"]),
      secureContext: config.secureContext ? maskAll(config.secureContext) : undefined,
    });
    const response = await provider.generateResponse(modelEntry.model, messages, {
      ...this.defaultConfig,
      ...config,
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
   * @param messages
   * @param config
   * @param autoApprove
   */
  async generateAndProcessTools(
    messages: CoreLlmMessage[],
    config: JorElGenerationConfigWithTools = {},
    autoApprove = false,
  ): Promise<{ output: JorElGenerationOutput; messages: CoreLlmMessage[] }> {
    const _messages = [...messages];
    if (config.tools && config.tools.tools.some((t) => t.type !== "function")) {
      throw new Error("Only tools with a function executor can be used in this context");
    }

    const maxAttempts = config.maxAttempts || (config.tools ? 3 : 1);

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
        });
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
   * @param messages
   * @param config
   */
  async *generateContentStream(
    messages: CoreLlmMessage[],
    config: JorElGenerationConfigWithTools = {},
  ): AsyncGenerator<LlmStreamResponseChunk | LlmStreamResponse | LlmStreamResponseWithToolCalls, void, unknown> {
    const modelEntry = this.modelManager.getModel(config.model || this.modelManager.getDefaultModel());
    const provider = this.providerManager.getProvider(modelEntry.provider);
    this.logger.debug(
      "Core",
      `Starting to generate response stream with model ${modelEntry.model} and provider ${modelEntry.provider}`,
    );
    this.logger.silly("Core", `Response stream inputs`, {
      model: modelEntry.model,
      provider: modelEntry.provider,
      messages,
      ...omit(config, []),
    });

    const stream = provider.generateResponseStream(modelEntry.model, messages, {
      ...this.defaultConfig,
      ...config,
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
   * @param messages
   * @param config
   * @param autoApprove
   */
  async *generateStreamAndProcessTools(
    messages: CoreLlmMessage[],
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

    const maxAttempts = config.maxAttempts || (config.tools ? 3 : 1);
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

      response = await config.tools.processCalls(response, {
        context: config.context,
        secureContext: config.secureContext,
      });

      // Emit tool call completed events for each tool call
      for (const toolCall of response.toolCalls) {
        if (toolCall.executionState === "completed" || toolCall.executionState === "error") {
          yield {
            type: "toolCallCompleted",
            toolCall,
          };
        }
      }

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
   * Generate an embedding for a given text
   * @param text
   * @param model
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
