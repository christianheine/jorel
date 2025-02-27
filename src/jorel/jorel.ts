import { CreateLlmDocument, LlmDocument, LlmDocumentCollection } from "../documents";
import { LoggerOption, LogLevel, LogService } from "../logger";
import { ImageContent } from "../media";
import {
  AnthropicConfig,
  AnthropicProvider,
  defaultAnthropicBedrockModels,
  defaultAnthropicModels,
  defaultGrokModels,
  defaultGroqModels,
  defaultMistralAiEmbeddingModels,
  defaultMistralAiModels,
  defaultOpenAiEmbeddingModels,
  defaultOpenAiModels,
  defaultOpenRouterModels,
  defaultVertexAiModels,
  generateSystemMessage,
  generateUserMessage,
  GoogleVertexAiConfig,
  GoogleVertexAiProvider,
  GrokProvider,
  GroqConfig,
  GroqProvider,
  JsonSpecification,
  LlmAssistantMessage,
  LlmAssistantMessageMeta,
  LlmAssistantMessageWithToolCalls,
  LlmCoreProvider,
  LlmJsonResponseWithMeta,
  LlmMessage,
  LlmStreamResponse,
  LlmStreamResponseChunk,
  LlmStreamResponseMessages,
  LlmStreamResponseWithToolCalls,
  LlmStreamToolCallCompleted,
  LlmStreamToolCallStarted,
  LlmTextResponseWithMeta,
  LlmToolChoice,
  MistralConfig,
  MistralProvider,
  OllamaConfig,
  OllamaProvider,
  OpenAIConfig,
  OpenAIProvider,
  OpenRouterProvider,
} from "../providers";
import { generateUniqueId, Nullable } from "../shared";
import { LlmTool, LlmToolConfiguration, LLmToolContextSegment, LlmToolKit } from "../tools";
import { JorElCoreStore } from "./jorel.core";
import { JorElAgentManager } from "./jorel.team";

interface InitialConfig {
  anthropic?: AnthropicConfig | true;
  grok?: OpenAIConfig | true;
  groq?: GroqConfig | true;
  mistral?: MistralConfig | true;
  ollama?: OllamaConfig | true;
  openAI?: OpenAIConfig | true;
  openRouter?: OpenAIConfig | true;
  vertexAi?: GoogleVertexAiConfig | true;
  systemMessage?: Nullable<string>;
  documentSystemMessage?: string;
  temperature?: Nullable<number>;
  logger?: LoggerOption | LogService;
  logLevel?: LogLevel;
}

export interface JorElCoreGenerationConfig {
  temperature?: Nullable<number>;
  maxTokens?: number;
}

export interface JorElTextGenerationConfigWithTools extends JorElCoreGenerationConfig {
  model?: string;
  systemMessage?: string;
  documentSystemMessage?: string;
  documents?: (LlmDocument | CreateLlmDocument)[] | LlmDocumentCollection;
  tools?: LlmToolKit | (LlmTool | LlmToolConfiguration)[];
  toolChoice?: LlmToolChoice;
  maxAttempts?: number;
  context?: LLmToolContextSegment;
  secureContext?: LLmToolContextSegment;
  messageHistory?: LlmMessage[];
}

export interface JorElJsonGenerationConfigWithTools extends JorElTextGenerationConfigWithTools {
  jsonSchema?: JsonSpecification;
  jsonSchemaDescription?: string;
}

export interface JorElGenerationConfigWithTools extends JorElCoreGenerationConfig {
  model?: string;
  tools?: LlmToolKit;
  toolChoice?: LlmToolChoice;
  maxAttempts?: number;
  context?: LLmToolContextSegment;
  secureContext?: LLmToolContextSegment;
  json?: boolean | JsonSpecification;
  jsonDescription?: string;
}

export type JorElTaskInput = string | (string | ImageContent)[];

export type JorElGenerationOutput = (LlmAssistantMessage | LlmAssistantMessageWithToolCalls) & {
  meta: LlmAssistantMessageMeta;
};

/**
 * Jor-El: Singular interface for managing multiple LLM providers and models
 */
export class JorEl {
  /**
   * System message use for all requests by default (unless specified per request)
   */
  public systemMessage;

  /**
   * Agent related functionality
   */
  public readonly team: JorElAgentManager;

  /**
   * Core store for managing providers
   * @internal
   */
  private readonly _core: JorElCoreStore;

  /**
   * Public methods for managing models
   */
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

  /**
   * Public methods for managing providers
   */
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
    registerMistral: (config?: MistralConfig) => {
      this._core.providerManager.registerProvider("mistral", new MistralProvider(config));
      for (const model of defaultMistralAiModels) {
        this.models.register({ model, provider: "mistral" });
      }
      for (const { model, dimensions } of defaultMistralAiEmbeddingModels) {
        this.models.embeddings.register({ model, dimensions, provider: "mistral" });
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
    registerOpenRouter: (config?: OpenAIConfig) => {
      this._core.providerManager.registerProvider("open-router", new OpenRouterProvider(config));
      for (const model of defaultOpenRouterModels) {
        this.models.register({ model, provider: "open-router" });
      }
    },
    registerGoogleVertexAi: (config?: GoogleVertexAiConfig) => {
      this._core.providerManager.registerProvider("google-vertex-ai", new GoogleVertexAiProvider(config));
      for (const model of defaultVertexAiModels) {
        this.models.register({ model, provider: "google-vertex-ai" });
      }
    },
    anthropic: {
      addModel: (model: string) => this.models.register({ model, provider: "anthropic" }),
      getClient: () => (this._core.providerManager.getProvider("anthropic") as AnthropicProvider).client,
    },
    openAi: {
      addModel: (model: string) => this.models.register({ model, provider: "openai" }),
      getClient: () => (this._core.providerManager.getProvider("openai") as OpenAIProvider).client,
    },
    grok: {
      addModel: (model: string) => this.models.register({ model, provider: "grok" }),
      getClient: () => (this._core.providerManager.getProvider("grok") as GrokProvider).client,
    },
    groq: {
      addModel: (model: string) => this.models.register({ model, provider: "groq" }),
      getClient: () => (this._core.providerManager.getProvider("groq") as GroqProvider).client,
    },
    mistral: {
      addModel: (model: string) => this.models.register({ model, provider: "mistral" }),
      getClient: () => (this._core.providerManager.getProvider("mistral") as MistralProvider).client,
    },
    openRouter: {
      addModel: (model: string) => this.models.register({ model, provider: "open-router" }),
      getClient: () => (this._core.providerManager.getProvider("open-router") as OpenRouterProvider).client,
    },
    vertexAi: {
      addModel: (model: string) => this.models.register({ model, provider: "google-vertex-ai" }),
      getClient: () => (this._core.providerManager.getProvider("google-vertex-ai") as GoogleVertexAiProvider).client,
    },
  };

  /**
   * Create a new Jor-El instance.
   *
   * @param config - The configuration for the Jor-El instance.
   * @param config.anthropic - Anthropic configuration (optional).
   * @param config.grok - Grok configuration (optional).
   * @param config.groq - Groq configuration (optional).
   * @param config.vertexAi - Google Vertex AI configuration (optional).
   * @param config.ollama - Ollama configuration (optional).
   * @param config.openAI - OpenAI configuration (optional).
   * @param config.openRouter - OpenRouter configuration (optional).
   * @param config.systemMessage - System message to include in all requests (optional).
   * @param config.documentSystemMessage - System message to include in all requests with documents (optional).
   * @param config.temperature - Default temperature for all requests (optional).
   */
  constructor(config: InitialConfig = {}) {
    this.systemMessage = config.systemMessage ?? "You are a helpful assistant.";
    this._documentSystemMessage = config.documentSystemMessage
      ? this.validateDocumentSystemMessage(config.documentSystemMessage)
      : "Here are some documents that you can consider in your response: {{documents}}";
    this._core = new JorElCoreStore({
      temperature: config.temperature === undefined ? 0 : config.temperature,
      logger: config.logger,
      logLevel: config.logLevel,
    });
    this.team = new JorElAgentManager(this._core);
    if (config.anthropic) this.providers.registerAnthropic(config.anthropic === true ? undefined : config.anthropic);
    if (config.grok) this.providers.registerGrok(config.grok === true ? undefined : config.grok);
    if (config.groq) this.providers.registerGroq(config.groq === true ? undefined : config.groq);
    if (config.mistral) this.providers.registerMistral(config.mistral === true ? undefined : config.mistral);
    if (config.vertexAi) this.providers.registerGoogleVertexAi(config.vertexAi === true ? undefined : config.vertexAi);
    if (config.ollama) this.providers.registerOllama(config.ollama === true ? undefined : config.ollama);
    if (config.openAI) this.providers.registerOpenAi(config.openAI === true ? undefined : config.openAI);
    if (config.openRouter)
      this.providers.registerOpenRouter(config.openRouter === true ? undefined : config.openRouter);
  }

  /** @internal */
  private _documentSystemMessage;

  /**
   * Default document system message for all requests (only used when documents are included)
   */
  public get documentSystemMessage(): string {
    return this._documentSystemMessage;
  }

  /**
   * Set the default document system message for all requests (only used when documents are included)
   */
  public set documentSystemMessage(documentSystemMessage: string) {
    this._documentSystemMessage = this.validateDocumentSystemMessage(documentSystemMessage);
  }

  /**
   * Default temperature for all requests
   */
  public get temperature(): Nullable<number> | undefined {
    return this._core.defaultConfig.temperature;
  }

  /**
   * Set the default temperature for all requests
   */
  public set temperature(temperature: Nullable<number>) {
    this._core.defaultConfig.temperature = temperature;
  }

  /**
   * Logger instance
   */
  public get logger() {
    return this._core.logger;
  }

  /**
   * Set the logger instance
   */
  public set logger(logger: LogService) {
    this._core.logger = logger;
  }

  /**
   * Log level
   */
  public get logLevel() {
    return this._core.logger.logLevel;
  }

  /**
   * Set the log level
   */
  public set logLevel(logLevel: LogLevel) {
    this._core.logger.logLevel = logLevel;
  }

  /**
   * Generate a response for a given set of messages.
   *
   * @param messages - The messages to generate a response for.
   * @param config - The configuration for the generation.
   * @param config.model - Model to use for this generation (optional).
   * @param config.systemMessage - System message to include in this request (optional).
   * @param config.temperature - Temperature for this request (optional).
   * @param config.tools - Tools to use for this request (optional).
   */
  async generate(messages: LlmMessage[], config: JorElGenerationConfigWithTools = {}): Promise<JorElGenerationOutput> {
    return this._core.generate(messages, config);
  }

  /**
   * Generate a response for a given task.
   * @deprecated Use `text` instead.
   * @param task - The task to generate a response for (either a string or an array of strings and ImageContent objects).
   * @param config - Configuration for the specific generation.
   * @param includeMeta - Whether to include the metadata and all previous messages in the response.
   * @returns The text response, or an object with the response, metadata, and messages.
   */
  async ask(task: JorElTaskInput, config?: JorElTextGenerationConfigWithTools, includeMeta?: false): Promise<string>;
  async ask(
    task: JorElTaskInput,
    config?: JorElTextGenerationConfigWithTools,
    includeMeta?: true,
  ): Promise<{ response: string; meta: LlmAssistantMessageMeta; messages: LlmMessage[] }>;
  async ask(
    task: JorElTaskInput,
    config: JorElTextGenerationConfigWithTools = {},
    includeMeta = false,
  ): Promise<string | { response: string; meta: LlmAssistantMessageMeta; messages: LlmMessage[] }> {
    // @ts-expect-error ts(2769) - overloads
    return this.text(task, config, includeMeta);
  }

  /**
   * Generate a response for a given task.
   *
   * @param task - The task to generate a response for (either a string or an array of strings and ImageContent objects).
   * @param config - Configuration for the specific generation.
   * @param includeMeta - Whether to include the metadata and all previous messages in the response.
   * @returns The text response, or an object with the response, metadata, and messages.
   */
  async text(task: JorElTaskInput, config?: JorElTextGenerationConfigWithTools, includeMeta?: false): Promise<string>;
  async text(
    task: JorElTaskInput,
    config?: JorElTextGenerationConfigWithTools,
    includeMeta?: true,
  ): Promise<LlmTextResponseWithMeta>;
  async text(
    task: JorElTaskInput,
    config: JorElTextGenerationConfigWithTools = {},
    includeMeta = false,
  ): Promise<string | LlmTextResponseWithMeta> {
    const { systemMessage, documents, documentSystemMessage, messageHistory, ...coreConfig } = config;
    const _messages = await this.generateMessages(
      task,
      systemMessage,
      documents,
      documentSystemMessage,
      messageHistory,
    );
    const _config: JorElGenerationConfigWithTools = {
      ...coreConfig,
      tools: config.tools
        ? config.tools instanceof LlmToolKit
          ? config.tools
          : new LlmToolKit(config.tools)
        : undefined,
    };
    const { output, messages } = await this._core.generateAndProcessTools(_messages, _config);
    const response = output.content || "";
    const meta = output.meta;
    return includeMeta ? { response, meta, messages } : response;
  }

  /**
   * Generate a JSON response for a given task.
   *
   * @param task - The task to generate a response for (either a string or an array of strings and ImageContent objects).
   * @param config - Configuration for the specific generation.
   * @param includeMeta - Whether to include the metadata and all previous messages in the response.
   * @returns The JSON response, or an object with the response, metadata, and messages.
   * @throws Error - If the response is not valid JSON.
   */
  async json(task: JorElTaskInput, config?: JorElJsonGenerationConfigWithTools, includeMeta?: false): Promise<object>;
  async json(
    task: JorElTaskInput,
    config?: JorElJsonGenerationConfigWithTools,
    includeMeta?: true,
  ): Promise<LlmJsonResponseWithMeta>;
  async json(
    task: JorElTaskInput,
    config: JorElJsonGenerationConfigWithTools = {},
    includeMeta = false,
  ): Promise<object | LlmJsonResponseWithMeta> {
    const { systemMessage, documents, documentSystemMessage, messageHistory, ...coreConfig } = config;
    const _messages = await this.generateMessages(
      task,
      systemMessage,
      documents,
      documentSystemMessage,
      messageHistory,
    );
    const _config: JorElGenerationConfigWithTools = {
      ...coreConfig,
      json: config.jsonSchema || true,
      tools: config.tools
        ? config.tools instanceof LlmToolKit
          ? config.tools
          : new LlmToolKit(config.tools)
        : undefined,
    };
    const { output, messages } = await this._core.generateAndProcessTools(_messages, _config);
    const parsed = output.content ? LlmToolKit.deserialize(output.content) : {};
    return includeMeta ? { response: parsed, meta: output.meta, messages } : parsed;
  }

  /**
   * Generate a stream of response chunks for a given set of messages.
   *
   * @param messages - The messages to generate a response for.
   * @param config - The configuration for the generation.
   */
  async *generateContentStream(messages: LlmMessage[], config: JorElGenerationConfigWithTools = {}) {
    yield* this._core.generateContentStream(messages, config);
  }

  /**
   * Generate a stream of response chunks for a given task.
   *
   * @param task - The task to generate a response for (either a string or an array of strings and ImageContent objects).
   * @param config - Configuration for the specific generation.
   */
  async *stream(
    task: JorElTaskInput,
    config: JorElTextGenerationConfigWithTools = {},
  ): AsyncGenerator<string, void, unknown> {
    const stream = this.streamWithMeta(task, config);
    for await (const chunk of stream) {
      if (chunk.type === "chunk" && chunk.content) yield chunk.content;
    }
  }

  /**
   * Generate a stream of response chunks for a given task with metadata.
   *
   * @param task - The task to generate a response for (either a string or an array of strings and ImageContent objects).
   * @param config - Configuration for the specific generation.
   */
  async *streamWithMeta(
    task: JorElTaskInput,
    config: JorElTextGenerationConfigWithTools = {},
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
    const { systemMessage, documents, documentSystemMessage, messageHistory, ...coreConfig } = config;
    const messages = await this.generateMessages(task, systemMessage, documents, documentSystemMessage, messageHistory);
    const _config = {
      ...coreConfig,
      tools: config.tools
        ? config.tools instanceof LlmToolKit
          ? config.tools
          : new LlmToolKit(config.tools)
        : undefined,
    };
    if (config.tools) {
      yield* this._core.generateStreamAndProcessTools(messages, _config);
    } else {
      const stream = this._core.generateContentStream(messages, _config);
      for await (const chunk of stream) {
        if (chunk.type === "chunk") {
          yield chunk;
        }
        if (chunk.type === "response") {
          yield chunk;
          if (chunk.role === "assistant") {
            messages.push({
              id: generateUniqueId(),
              role: "assistant",
              content: chunk.content,
              createdAt: Date.now(),
            });
          } else {
            messages.push({
              id: generateUniqueId(),
              role: "assistant_with_tools",
              content: chunk.content,
              toolCalls: chunk.toolCalls,
              createdAt: Date.now(),
            });
          }
          yield { type: "messages", messages };
        }
      }
    }
  }

  /**
   * Create an embedding for a given text.
   *
   * @param text - The text to create an embedding for.
   * @param config - The configuration for the embedding.
   * @param config.model - The model to use for the embedding (optional).
   */
  async embed(text: string, config: { model?: string } = {}): Promise<number[]> {
    return this._core.generateEmbedding(text, config.model);
  }

  /**
   * Generate a system message - optionally with a set of documents.
   *
   * @param systemMessage - The system message to use.
   * @param documents - The documents to include in the system message (optional).
   * @param documentSystemMessage - The system message to use for documents (optional).
   */
  generateSystemMessage(
    systemMessage: string = "",
    {
      documents,
      documentSystemMessage,
    }: { documents?: (LlmDocument | CreateLlmDocument)[] | LlmDocumentCollection; documentSystemMessage?: string } = {},
  ) {
    const _documents = documents instanceof LlmDocumentCollection ? documents : new LlmDocumentCollection(documents);
    return generateSystemMessage(
      systemMessage || this.systemMessage,
      documentSystemMessage || this._documentSystemMessage,
      _documents,
    );
  }

  /**
   * Generate a user message.
   *
   * @param content - The content to include in the user message.
   */
  generateUserMessage(content: JorElTaskInput) {
    return generateUserMessage(content);
  }

  /**
   * Helper to generate messages for a given task input.
   *
   * @param content - The task input content (either a string or an array of strings and ImageContent objects).
   * @param systemMessage - The system message to include (optional).
   * @param documents - The documents to include in the system message (optional).
   * @param documentSystemMessage - The system message to use for documents (optional).
   * @param messageHistory - The message history to include (optional). If provided along with a dedicated system
   * message, the system message inside the messages will be ignored.
   * @internal
   */
  private async generateMessages(
    content: JorElTaskInput,
    systemMessage?: string,
    documents?: (LlmDocument | CreateLlmDocument)[] | LlmDocumentCollection,
    documentSystemMessage?: string,
    messageHistory: LlmMessage[] = [],
  ): Promise<LlmMessage[]> {
    if (Array.isArray(content)) {
      if (content.length === 0) {
        throw new Error("The task input must not be an empty array.");
      }
    } else {
      if (!content) {
        throw new Error("The task input must not be empty.");
      }
    }

    const _userMessage = await this.generateUserMessage(content);

    // Empty string overrides default to skip system message
    if (systemMessage !== "" && (systemMessage || this.systemMessage)) {
      if (messageHistory && messageHistory.some((m) => m.role === "system")) {
        this._core.logger.info("JorEl", "Message history contains system messages. These will be ignored.");
      }
      const _systemMessage = this.generateSystemMessage(systemMessage, { documents, documentSystemMessage });
      return [_systemMessage, ...messageHistory.filter((m) => m.role !== "system"), _userMessage];
    } else {
      if (documents && documents.length > 0) {
        this.logger.warn(
          "JorEl",
          "Documents were provided but no system message was included. The documents will not be included in the response.",
        );
      }
    }
    return [...messageHistory, _userMessage];
  }

  /**
   * Helper to validate the document system message.
   *
   * @param documentSystemMessage - The document system message to validate.
   * @internal
   */
  private validateDocumentSystemMessage(documentSystemMessage: string) {
    if (!documentSystemMessage) return documentSystemMessage;
    if (documentSystemMessage.includes("{{documents}}")) return documentSystemMessage;
    throw new Error(
      'The "documentSystemMessage" must either be empty or include the placeholder "{{documents}}" to insert the document list.',
    );
  }
}
