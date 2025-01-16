import { JorElProviderManager } from "./jorel.providers";
import { JorElModelManager } from "./jorel.models";
import { LlmAssistantMessageWithToolCalls, LlmGenerationConfig, LlmMessage, MaybeUndefined } from "../shared";
import { JorElAskGenerationConfig, JorElAskGenerationConfigWithTools, JorElGenerationOutput } from "./jorel";

export class JorElCoreStore {
  defaultConfig: LlmGenerationConfig = {};

  constructor(
    public providerManager: JorElProviderManager,
    public modelManager: JorElModelManager,
    config: LlmGenerationConfig = {},
  ) {
    this.providerManager = providerManager;
    this.modelManager = modelManager;
    this.defaultConfig = config;
  }

  /**
   * Generate a response for a given set of messages
   * @param messages
   * @param config
   * @param config.model Model to use for this generation (optional)
   * @param config.systemMessage System message to include in this request (optional)
   * @param config.temperature Temperature for this request (optional)
   * @param config.tools Tools to use for this request (optional)
   * @param json
   */
  async generate(
    messages: LlmMessage[],
    config: JorElAskGenerationConfigWithTools = {},
    json?: boolean,
  ): Promise<JorElGenerationOutput> {
    const modelEntry = this.modelManager.getModel(config.model || this.modelManager.getDefaultModel());
    const provider = this.providerManager.getProvider(modelEntry.provider);
    return await provider.generateResponse(modelEntry.model, messages, {
      ...this.defaultConfig,
      ...config,
      json,
    });
  }

  /**
   * Internal method to generate a response and process tool calls until a final response is generated
   * @param messages
   * @param config
   * @param json
   * @param autoApprove
   * @private
   */
  async generateAndProcessTools(
    messages: (LlmMessage | LlmAssistantMessageWithToolCalls)[],
    config: JorElAskGenerationConfigWithTools = {},
    json = false,
    autoApprove = false,
  ): Promise<JorElGenerationOutput> {
    const maxAttempts = config.maxAttempts || (config.tools ? 3 : 1);
    let generation: MaybeUndefined<JorElGenerationOutput>;
    for (let i = 0; i < maxAttempts; i++) {
      generation = await this.generate(messages, config, json);
      if (generation.role === "assistant" || !config.tools) {
        break;
      } else {
        generation = autoApprove ? config.tools.approveCalls(generation) : generation;
        generation = await config.tools.processCalls(generation, {
          context: config.context,
          secureContext: config.secureContext,
        });
        messages.push({
          role: generation.role,
          content: generation.content,
          toolCalls: generation.toolCalls,
        });
      }
    }

    if (!generation) {
      throw new Error("Unable to generate a response");
    }

    return generation;
  }

  /**
   * Generate a stream of response chunks for a given set of messages
   * @param messages
   * @param config
   */
  async *generateContentStream(messages: LlmMessage[], config: JorElAskGenerationConfig = {}) {
    const modelEntry = this.modelManager.getModel(config.model || this.modelManager.getDefaultModel());
    const provider = this.providerManager.getProvider(modelEntry.provider);
    const stream = provider.generateResponseStream(modelEntry.model, messages, {
      ...this.defaultConfig,
      ...config,
    });
    yield* stream;
  }

  /**
   * Generate an embedding for a given text
   * @param text
   * @param model
   */
  async generateEmbedding(text: string, model?: string) {
    const modelEntry = this.modelManager.getEmbeddingModel(model || this.modelManager.getDefaultEmbeddingModel());
    const provider = this.providerManager.getProvider(modelEntry.provider);
    return await provider.createEmbedding(modelEntry.model, text);
  }
}
