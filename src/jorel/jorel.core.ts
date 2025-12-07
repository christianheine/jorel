import { LogService } from "../logger";
import {
  generateAssistantMessage,
  InitLlmGenerationConfig,
  LlmError,
  LlmErrorType,
  LlmGenerationAttempt,
  LLmGenerationStopReason,
  LlmMessage,
  LlmStreamEvent,
  LlmStreamProviderResponseChunk,
  LlmStreamProviderResponseChunkEvent,
  LlmStreamProviderResponseReasoningChunk,
  LlmStreamResponse,
  LlmStreamResponseEvent,
  LlmStreamResponseReasoningChunk,
  LlmStreamResponseWithToolCalls,
  LlmStreamToolCallCompleted,
  LlmStreamToolCallEvent,
  LlmStreamToolCallStarted,
  LlmToolCall,
  StreamBufferConfig,
} from "../providers";
import { getModelOverrides } from "../providers/get-overrides";
import { modelParameterOverrides } from "../providers/model-parameter-overrides";
import { generateUniqueId, JorElAbortError, maskAll, MaybeUndefined, omit, shallowFilterUndefined } from "../shared";
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
  ): Promise<{
    output: JorElGenerationOutput;
    messages: LlmMessage[];
    stopReason: LLmGenerationStopReason;
    error?: { message: string; type: LlmErrorType };
  }> {
    const _messages = [...messages];

    const maxToolCalls = config.maxToolCalls || 5;
    const maxToolCallErrors = config.maxToolCallErrors || 3;

    const maxAttempts = Math.max(maxToolCalls, maxToolCallErrors);

    let toolCallErrors = 0;
    let toolCalls = 0;

    // Track cumulative token usage across all generations
    const generations: LlmGenerationAttempt[] = [];

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalDurationMs = 0;

    let generation: MaybeUndefined<JorElGenerationOutput>;
    for (let i = 0; i < maxAttempts; i++) {
      generation = await this.generate(_messages, config);

      // Track this generation attempt
      generations.push({
        model: generation.meta.model,
        provider: generation.meta.provider,
        temperature: generation.meta.temperature,
        durationMs: generation.meta.durationMs,
        inputTokens: generation.meta.inputTokens,
        outputTokens: generation.meta.outputTokens,
        hadToolCalls: generation.role === "assistant_with_tools",
        timestamp: Date.now(),
      });

      // Accumulate token counts
      totalInputTokens += generation.meta.inputTokens || 0;
      totalOutputTokens += generation.meta.outputTokens || 0;
      totalDurationMs += generation.meta.durationMs;

      if (generation.role === "assistant" || !config.tools) {
        break;
      } else {
        generation = autoApprove ? config.tools.utilities.message.approveToolCalls(generation) : generation;

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
          abortSignal: config.abortSignal,
        });

        toolCalls += generation.toolCalls.length;
        toolCallErrors += generation.toolCalls.filter((t) => t.executionState === "error").length;

        this.logger.debug("Core", `Finished processing tool calls`);
        this.logger.silly("Core", `Tool call outputs`, {
          generation,
        });

        _messages.push(generateAssistantMessage(generation.content, generation.reasoningContent, generation.toolCalls));

        const classification = config.tools.classifyToolCalls(generation.toolCalls);

        if (classification === "approvalPending") {
          this.logger.debug("Core", "Tool calls require approval - stopping processing");

          // Update meta with cumulative token usage if there were multiple generations
          if (generations.length > 1) {
            generation = {
              ...generation,
              meta: {
                ...generation.meta,
                inputTokens: totalInputTokens || undefined,
                outputTokens: totalOutputTokens || undefined,
                durationMs: totalDurationMs,
                generations,
              },
            };
          }

          return {
            output: generation,
            messages: _messages,
            stopReason: "toolCallsRequireApproval",
          };
        }
      }
    }

    // If no generation was produced
    if (!generation) {
      if (config.abortSignal?.aborted) {
        throw new JorElAbortError("Request was aborted before generation could complete");
      }
      // This shouldn't happen in normal operation - indicates a bug
      throw new Error("Unable to generate a response");
    }

    // Update meta with cumulative token usage if there were multiple generations
    if (generations.length > 1) {
      generation = {
        ...generation,
        meta: {
          ...generation.meta,
          inputTokens: totalInputTokens || undefined,
          outputTokens: totalOutputTokens || undefined,
          durationMs: totalDurationMs,
          generations,
        },
      };
    }

    _messages.push(generateAssistantMessage(generation.content, generation.reasoningContent));

    return {
      output: generation,
      messages: _messages,
      stopReason: config.abortSignal?.aborted ? "userCancelled" : "completed",
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
  ): AsyncGenerator<
    LlmStreamProviderResponseChunkEvent | LlmStreamToolCallEvent | LlmStreamResponseEvent,
    void,
    unknown
  > {
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
      ...omit(configWithOverrides, ["streamBuffer"]),
      streamBuffer: configWithOverrides.streamBuffer ? { ...configWithOverrides.streamBuffer } : undefined,
    });

    const stream = provider.generateResponseStream(modelEntry.model, messagesWithOverrides, {
      ...this.defaultConfig,
      ...configWithOverrides,
      logger: this.logger,
    });

    // Apply buffering if configured
    const bufferedStream = this.createBufferedStream(stream, configWithOverrides.streamBuffer);

    for await (const chunk of bufferedStream) {
      yield chunk;
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
  ): AsyncGenerator<LlmStreamEvent, void, unknown> {
    if (config.tools && config.tools.tools.some((t) => t.type !== "function")) {
      throw new Error("Only tools with a function executor can be used in this context");
    }

    const maxToolCalls = config.maxToolCalls || 5;
    const maxToolCallErrors = config.maxToolCallErrors || 3;

    const maxAttempts = Math.max(maxToolCalls, maxToolCallErrors);

    let toolCallErrors = 0;
    let toolCalls = 0;

    // Track cumulative token usage across all generations
    const generations: LlmGenerationAttempt[] = [];

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalDurationMs = 0;

    let response: MaybeUndefined<LlmStreamResponse | LlmStreamResponseWithToolCalls> = undefined;
    let finalStopReason: LLmGenerationStopReason = "completed";
    let finalError: LlmError | undefined;
    let messageId: string = generateUniqueId();

    for (let i = 0; i < maxAttempts; i++) {
      yield { type: "messageStart", messageId };
      const stream = this.generateContentStream(messages, config);

      for await (const chunk of stream) {
        if (chunk.type === "chunk") {
          yield { ...chunk, messageId };
        } else if (chunk.type === "reasoningChunk") {
          yield { ...chunk, messageId };
        } else if (chunk.type === "response") {
          response = chunk;

          // Track this generation attempt
          generations.push({
            model: chunk.meta.model,
            provider: chunk.meta.provider,
            temperature: chunk.meta.temperature,
            durationMs: chunk.meta.durationMs,
            inputTokens: chunk.meta.inputTokens,
            outputTokens: chunk.meta.outputTokens,
            hadToolCalls: chunk.role === "assistant_with_tools",
            timestamp: Date.now(),
          });

          // Accumulate token counts
          totalInputTokens += chunk.meta.inputTokens || 0;
          totalOutputTokens += chunk.meta.outputTokens || 0;
          totalDurationMs += chunk.meta.durationMs;

          // Capture the stop reason and error from the provider
          if (chunk.stopReason) {
            finalStopReason = chunk.stopReason;
          }
          if (chunk.error) {
            finalError = chunk.error;
          }
        }
      }

      if (!response) throw new Error("Unable to generate a response");

      // If cancelled or errored, don't process tool calls - emit final events and return
      if (finalStopReason === "userCancelled" || finalStopReason === "generationError") {
        // Update meta with cumulative token usage if there were multiple generations
        if (generations.length > 1) {
          response = {
            ...response,
            meta: {
              ...response.meta,
              inputTokens: totalInputTokens || undefined,
              outputTokens: totalOutputTokens || undefined,
              durationMs: totalDurationMs,
              generations,
            },
          };
        }

        const message = generateAssistantMessage(
          response.content,
          response.reasoningContent,
          response.role === "assistant_with_tools" ? response.toolCalls : undefined,
          messageId,
        );

        yield { type: "messageEnd", messageId, message };

        messages.push(message);

        yield response;

        yield {
          type: "messages",
          messages,
          stopReason: finalStopReason,
          error: finalError,
        };

        return; // Stop processing
      }

      if (response.role === "assistant" || !config.tools) break;

      response = autoApprove ? config.tools.utilities.message.approveToolCalls(response) : response;

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

      // Check if any tool calls require approval - if so, stop processing and return
      const hasToolCallsRequiringApproval = response.toolCalls.some((tc) => tc.approvalState === "requiresApproval");

      if (hasToolCallsRequiringApproval) {
        // Stop processing and return messages with approval required reason
        const message = generateAssistantMessage(
          response.content,
          response.reasoningContent,
          response.toolCalls,
          messageId,
        );

        yield { type: "messageEnd", messageId, message };

        messages.push(message);

        messageId = generateUniqueId();

        // Update meta with cumulative token usage
        if (generations.length > 1) {
          response = {
            ...response,
            meta: {
              ...response.meta,
              inputTokens: totalInputTokens || undefined,
              outputTokens: totalOutputTokens || undefined,
              durationMs: totalDurationMs,
              generations,
            },
          };
        }

        yield response;
        yield {
          type: "messages",
          messages,
          stopReason: "toolCallsRequireApproval",
        };

        return; // Stop processing - don't execute tools requiring approval
      }

      const processedToolCalls: LlmToolCall[] = [];

      for (const toolCall of response.toolCalls) {
        // Check if the request was aborted
        if (config.abortSignal?.aborted) {
          this.setCallToError(toolCall, "Request was aborted");
          processedToolCalls.push(toolCall);
          continue;
        }

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

      const message = generateAssistantMessage(
        response.content,
        response.reasoningContent,
        response.toolCalls,
        messageId,
      );
      yield { type: "messageEnd", messageId, message };
      messages.push(message);
      messageId = generateUniqueId();
    }

    if (response) {
      // Update meta with cumulative token usage if there were multiple generations
      if (generations.length > 1) {
        response = {
          ...response,
          meta: {
            ...response.meta,
            inputTokens: totalInputTokens || undefined,
            outputTokens: totalOutputTokens || undefined,
            durationMs: totalDurationMs,
            generations,
          },
        };
      }

      const message = generateAssistantMessage(response.content, response.reasoningContent, undefined, messageId);
      yield { type: "messageEnd", messageId, message };
      messages.push(message);

      yield response;
    }

    yield {
      type: "messages",
      messages,
      stopReason: finalStopReason,
      error: finalError,
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
   * Helper method to create a buffered stream from content chunks
   */
  private async *createBufferedStream(
    stream: AsyncGenerator<
      | LlmStreamProviderResponseChunk
      | LlmStreamProviderResponseReasoningChunk
      | LlmStreamResponse
      | LlmStreamResponseReasoningChunk
      | LlmStreamResponseWithToolCalls
      | LlmStreamToolCallStarted
      | LlmStreamToolCallCompleted,
      void,
      unknown
    >,
    bufferConfig?: StreamBufferConfig,
  ): AsyncGenerator<
    | LlmStreamProviderResponseChunk
    | LlmStreamProviderResponseReasoningChunk
    | LlmStreamResponse
    | LlmStreamResponseReasoningChunk
    | LlmStreamResponseWithToolCalls
    | LlmStreamToolCallStarted
    | LlmStreamToolCallCompleted,
    void,
    unknown
  > {
    // If buffering is disabled or no buffer time is set, pass through directly
    if (bufferConfig?.disabled || !bufferConfig?.bufferTimeMs || bufferConfig.bufferTimeMs <= 0) {
      yield* stream;
      return;
    }

    let buffer = "";
    let reasoningBuffer = "";

    let bufferStartTime: number | null = null;
    let reasoningBufferStartTime: number | null = null;

    const flushBuffer = function* () {
      if (buffer) {
        yield {
          type: "chunk" as const,
          content: buffer,
          chunkId: generateUniqueId(),
        };
        buffer = "";
        bufferStartTime = null;
      }
    };

    const flushReasoningBuffer = function* () {
      if (reasoningBuffer) {
        yield {
          type: "reasoningChunk" as const,
          content: reasoningBuffer,
          chunkId: generateUniqueId(),
        };
        reasoningBuffer = "";
      }
    };

    const shouldFlushBuffer = (): boolean => {
      if (!buffer || bufferStartTime === null) return false;
      return Date.now() - bufferStartTime >= bufferConfig.bufferTimeMs!;
    };

    const shouldFlushReasoningBuffer = (): boolean => {
      if (!reasoningBuffer || reasoningBufferStartTime === null) return false;
      return Date.now() - reasoningBufferStartTime >= bufferConfig.bufferTimeMs!;
    };

    try {
      for await (const chunk of stream) {
        // Handle content chunks - these get buffered
        if (chunk.type === "chunk") {
          // Start timing if this is the first content in buffer
          if (!buffer) {
            bufferStartTime = Date.now();
          }

          buffer += chunk.content;

          // Check if buffer time has elapsed
          if (shouldFlushBuffer()) {
            yield* flushBuffer();
          }
        } else if (chunk.type === "reasoningChunk") {
          // Start timing if this is the first reasoning chunk in buffer
          if (!reasoningBuffer) {
            reasoningBufferStartTime = Date.now();
          }

          reasoningBuffer += chunk.content;

          if (shouldFlushReasoningBuffer()) {
            yield* flushReasoningBuffer();
          }
        } else {
          // For non-content chunks (response, toolCallStarted, toolCallCompleted)
          // Flush any buffered content first, then emit the chunk
          if (buffer) {
            yield* flushBuffer();
          }
          if (reasoningBuffer) {
            yield* flushReasoningBuffer();
          }
          yield chunk;
        }
      }
    } finally {
      // Ensure any remaining buffer is flushed when stream ends
      if (buffer) {
        yield* flushBuffer();
      }
      if (reasoningBuffer) {
        yield* flushReasoningBuffer();
      }
    }
  }

  /**
   * Generate an embedding for a given text
   * @param text - The text to generate an embedding for
   * @param model - The model to use for this generation (optional)
   * @param abortSignal - AbortSignal to cancel the embedding request (optional)
   */
  async generateEmbedding(text: string, model?: string, abortSignal?: AbortSignal) {
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
    return await provider.createEmbedding(modelEntry.model, text, abortSignal);
  }
}
