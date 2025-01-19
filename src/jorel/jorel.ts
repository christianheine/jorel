import {
  AnthropicConfig,
  AnthropicProvider,
  CoreLlmMessage,
  defaultAnthropicBedrockModels,
  defaultAnthropicModels,
  defaultGrokModels,
  defaultGroqModels,
  defaultOpenAiEmbeddingModels,
  defaultOpenAiModels,
  defaultVertexAiModels,
  generateSystemMessage,
  generateUserMessage,
  GoogleVertexAiConfig,
  GoogleVertexAiProvider,
  GrokProvider,
  GroqConfig,
  GroqProvider,
  LlmAssistantMessage,
  LlmAssistantMessageMeta,
  LlmAssistantMessageWithToolCalls,
  LlmCoreProvider,
  LlmMessage,
  LlmToolChoice,
  OllamaConfig,
  OllamaProvider,
  OpenAIConfig,
  OpenAIProvider,
} from "../providers";
import { ImageContent } from "../media";
import { LLmToolContextSegment, LlmToolKit } from "../tools";
import { JorElCoreStore } from "./jorel.core";
import { JorElAgentManager } from "./jorel.team";
import { LoggerOption, LogLevel, LogService } from "../logger";
import { CreateLlmDocument, LlmDocument, LlmDocumentCollection } from "../documents";

interface InitialConfig {
  anthropic?: AnthropicConfig | true;
  grok?: OpenAIConfig | true;
  groq?: GroqConfig | true;
  ollama?: OllamaConfig | true;
  openAI?: OpenAIConfig | true;
  vertexAi?: GoogleVertexAiConfig | true;
  systemMessage?: string;
  documentSystemMessage?: string;
  temperature?: number;
  logger?: LoggerOption | LogService;
  logLevel?: LogLevel;
}

export interface JorElCoreGenerationConfig {
  temperature?: number;
}

export interface JorElAskGenerationConfig extends JorElCoreGenerationConfig {
  model?: string;
  systemMessage?: string;
  documents?: (LlmDocument | CreateLlmDocument)[] | LlmDocumentCollection;
}

export interface JorElAskGenerationConfigWithTools extends JorElAskGenerationConfig {
  tools?: LlmToolKit;
  toolChoice?: LlmToolChoice;
  maxAttempts?: number;
  context?: LLmToolContextSegment;
  secureContext?: LLmToolContextSegment;
}

export type JorElTaskInput = string | (string | ImageContent)[];

export type JorElGenerationOutput = (LlmAssistantMessage | LlmAssistantMessageWithToolCalls) & {
  meta: LlmAssistantMessageMeta;
};

/**
 * Jor-El: Singular interface for managing multiple LLM providers and models
 */
export class JorEl {
  /** System message use for all requests by default (unless specified per request) */
  public systemMessage;
  public documentSystemMessage;
  public readonly team: JorElAgentManager;
  private readonly _core: JorElCoreStore;
  /** Public methods for managing models */
  public readonly models = {
    list: () => this._core.modelManager.listModels(),
    register: (params: { model: string; provider: string; setAsDefault?: boolean }) => {
      this._core.providerManager.getProvider(params.provider); // Ensure provider exists
      return this._core.modelManager.registerModel(params);
    },
    unregister: (model: string) => this._core.modelManager.unregisterModel(model),
    getDefault: () => this._core.modelManager.getDefaultModel(),
    setDefault: (model: string) =>
      this._core.modelManager.registerModel({
        model,
        provider: "",
        setAsDefault: true,
      }),
    embeddings: {
      register: (params: { model: string; provider: string; dimensions: number; setAsDefault?: boolean }) =>
        this._core.modelManager.registerEmbeddingModel(params),
      unregister: (model: string) => this._core.modelManager.unregisterEmbeddingModel(model),
      getDefault: () => this._core.modelManager.getDefaultEmbeddingModel(),
      setDefault: (model: string) => this._core.modelManager.setDefaultEmbeddingModel(model),
      list: () => this._core.modelManager.listEmbeddingModels(),
    },
  };
  /** Public methods for managing providers */
  public readonly providers = {
    list: () => this._core.providerManager.listProviders(),
    registerCustom: (provider: string, coreProvider: LlmCoreProvider) =>
      this._core.providerManager.registerProvider(provider, coreProvider),
    registerAnthropic: (config?: AnthropicConfig) => {
      this._core.providerManager.registerProvider("anthropic", new AnthropicProvider(config));
      const defaultModels = config?.bedrock ? defaultAnthropicBedrockModels : defaultAnthropicModels;
      for (const model of defaultModels) {
        this.models.register({ model, provider: "anthropic" });
      }
    },
    registerGrok: (config?: OpenAIConfig) => {
      this._core.providerManager.registerProvider("grok", new GrokProvider(config));
      for (const model of defaultGrokModels) {
        this.models.register({ model, provider: "grok" });
      }
    },
    registerGroq: (config?: GroqConfig) => {
      this._core.providerManager.registerProvider("groq", new GroqProvider(config));
      for (const model of defaultGroqModels) {
        this.models.register({ model, provider: "groq" });
      }
    },
    registerOllama: (config?: OllamaConfig) => {
      this._core.providerManager.registerProvider("ollama", new OllamaProvider(config));
    },
    registerOpenAi: (config?: OpenAIConfig) => {
      this._core.providerManager.registerProvider("openai", new OpenAIProvider(config));
      for (const model of defaultOpenAiModels) {
        this.models.register({ model, provider: "openai" });
      }
      for (const { model, dimensions } of defaultOpenAiEmbeddingModels) {
        this.models.embeddings.register({ model, dimensions, provider: "openai" });
      }
    },
    registerGoogleVertexAi: (config?: GoogleVertexAiConfig) => {
      this._core.providerManager.registerProvider("google-vertex-ai", new GoogleVertexAiProvider(config));
      for (const model of defaultVertexAiModels) {
        this.models.register({ model, provider: "google-vertex-ai" });
      }
    },
  };

  /**
   * Create a new Jor-El instance
   * @param config
   * @param config.anthropic Anthropic configuration (optional)
   * @param config.grok Grok configuration (optional)
   * @param config.groq Groq configuration (optional)
   * @param config.vertexAi Google Vertex AI configuration (optional)
   * @param config.ollama Ollama configuration (optional)
   * @param config.openAI OpenAI configuration (optional)
   * @param config.systemMessage System message to include in all requests (optional)
   * @param config.documentSystemMessage System message to include in all requests with documents (optional)
   * @param config.temperature Default temperature for all requests (optional)
   */
  constructor(config: InitialConfig = {}) {
    this.systemMessage = config.systemMessage ?? "You are a helpful assistant.";
    this.documentSystemMessage =
      config.documentSystemMessage ?? "Here are some documents that you can consider in your response: {{documents}}";
    this._core = new JorElCoreStore({
      temperature: config.temperature,
      logger: config.logger,
      logLevel: config.logLevel,
    });
    this.team = new JorElAgentManager(this._core);
    if (config.anthropic) this.providers.registerAnthropic(config.anthropic === true ? undefined : config.anthropic);
    if (config.grok) this.providers.registerGrok(config.grok === true ? undefined : config.grok);
    if (config.groq) this.providers.registerGroq(config.groq === true ? undefined : config.groq);
    if (config.vertexAi) this.providers.registerGoogleVertexAi(config.vertexAi === true ? undefined : config.vertexAi);
    if (config.ollama) this.providers.registerOllama(config.ollama === true ? undefined : config.ollama);
    if (config.openAI) this.providers.registerOpenAi(config.openAI === true ? undefined : config.openAI);
  }

  /**
   * Get the logger instance
   */
  public get logger() {
    return this._core.logger;
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
    messages: CoreLlmMessage[],
    config: JorElAskGenerationConfigWithTools = {},
    json?: boolean,
  ): Promise<JorElGenerationOutput> {
    return this._core.generate(messages, config, json);
  }

  /**
   * Generate a response for a given task
   * @param task
   * @param config
   * @param includeMeta
   */
  async ask(task: JorElTaskInput, config?: JorElAskGenerationConfigWithTools, includeMeta?: false): Promise<string>;
  async ask(
    task: JorElTaskInput,
    config?: JorElAskGenerationConfigWithTools,
    includeMeta?: true,
  ): Promise<{ response: string; meta: LlmAssistantMessageMeta }>;
  async ask(
    task: JorElTaskInput,
    config: JorElAskGenerationConfigWithTools = {},
    includeMeta = false,
  ): Promise<string | { response: string; meta: LlmAssistantMessageMeta }> {
    const generation = await this._core.generateAndProcessTools(
      this.generateMessages(task, config.systemMessage, config.documents),
      config,
      false,
      true,
    );
    const response = generation.content || "";
    const meta = generation.meta;
    return includeMeta ? { response, meta } : response;
  }

  /**
   * Generate a JSON response for a given task
   * @param task
   * @param config
   * @param includeMeta
   * @returns The JSON response
   * @throws Error - If the response is not valid JSON
   */
  async json(task: JorElTaskInput, config?: JorElAskGenerationConfigWithTools, includeMeta?: false): Promise<object>;
  async json(
    task: JorElTaskInput,
    config?: JorElAskGenerationConfigWithTools,
    includeMeta?: true,
  ): Promise<{ response: object; meta: LlmAssistantMessageMeta }>;
  async json(
    task: JorElTaskInput,
    config: JorElAskGenerationConfigWithTools = {},
    includeMeta = false,
  ): Promise<object | { response: object; meta: LlmAssistantMessageMeta }> {
    const messages = this.generateMessages(task, config.systemMessage, config.documents);
    const generation = await this._core.generateAndProcessTools(messages, config, true, true);
    const parsed = generation.content ? LlmToolKit.deserialize(generation.content) : {};
    return includeMeta ? { response: parsed, meta: generation.meta } : parsed;
  }

  /**
   * Generate a stream of response chunks for a given set of messages
   * @param messages
   * @param config
   */
  async *generateContentStream(messages: CoreLlmMessage[], config: JorElAskGenerationConfigWithTools = {}) {
    yield* this._core.generateContentStream(messages, config);
  }

  /**
   * Generate a stream of response chunks for a given task
   * @param task
   * @param config
   */
  async *stream(task: JorElTaskInput, config: JorElAskGenerationConfigWithTools = {}) {
    const messages = this.generateMessages(task, config.systemMessage, config.documents);
    const stream = config.tools
      ? this._core.generateStreamAndProcessTools(messages, config) // Still experimental
      : this._core.generateContentStream(messages, config);
    for await (const chunk of stream) {
      if (chunk.content) yield chunk.content;
    }
  }

  /**
   * Create an embedding for a given text
   * @param text
   * @param model
   */
  async embed(text: string, model?: string): Promise<number[]> {
    return this._core.generateEmbedding(text, model);
  }

  private generateMessages(
    content: JorElTaskInput,
    systemMessage?: string,
    documents?: (LlmDocument | CreateLlmDocument)[] | LlmDocumentCollection,
  ): LlmMessage[] {
    const _documents = documents instanceof LlmDocumentCollection ? documents : new LlmDocumentCollection(documents);
    if (systemMessage || this.systemMessage)
      return [
        generateSystemMessage(systemMessage || this.systemMessage, this.documentSystemMessage, _documents),
        generateUserMessage(content),
      ];
    return [generateUserMessage(content)];
  }
}
