import { CreateLlmDocument, LlmDocument, LlmDocumentCollection } from "../documents";
import { LoggerOption, LogLevel, LogService } from "../logger";
import { ImageContent } from "../media";
import {
  AnthropicConfig,
  AnthropicProvider,
  generateSystemMessage,
  generateUserMessage,
  GoogleGenerativeAIConfig,
  GoogleGenerativeAIProvider,
  GoogleVertexAiConfig,
  GoogleVertexAiProvider,
  GrokProvider,
  GroqConfig,
  GroqProvider,
  initialAnthropicBedrockModels,
  initialAnthropicModels,
  initialGoogleGenAiModels,
  initialGrokModels,
  initialGroqModels,
  initialMistralAiEmbeddingModels,
  initialMistralAiModels,
  initialOpenAiEmbeddingModels,
  initialOpenAiModels,
  initialOpenRouterModels,
  initialVertexAiModels,
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
  OpenAiAzureConfig,
  OpenAIConfig,
  OpenAIProvider,
  OpenRouterProvider,
  ReasoningEffort,
  StreamBufferConfig,
  Verbosity,
} from "../providers";
import { generateUniqueId, Nullable } from "../shared";
import { LlmTool, LlmToolConfiguration, LLmToolContextSegment, LlmToolKit } from "../tools";
import { JorElCoreStore } from "./jorel.core";
import { ModelSpecificDefaults } from "./jorel.models";
import { JorElAgentManager } from "./jorel.team";

interface InitialConfig {
  anthropic?: AnthropicConfig | true;
  googleGenAi?: GoogleGenerativeAIConfig | true;
  grok?: OpenAIConfig | true;
  groq?: GroqConfig | true;
  mistral?: MistralConfig | true;
  ollama?: OllamaConfig | true;
  openAI?: OpenAIConfig | true;
  openAiAzure?: Omit<OpenAiAzureConfig, "azure"> | true;
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
  /** Reasoning effort for the model - only supported by some providers & models (currently mainly OpenAI) */
  reasoningEffort?: ReasoningEffort;
  /** Verbosity for the model - only supported by some providers & models (currently only OpenAI) */
  verbosity?: Verbosity;
  /** Stream buffering configuration for controlling chunk emission rate */
  streamBuffer?: StreamBufferConfig;
}

export interface JorElTextGenerationConfigWithTools extends JorElCoreGenerationConfig {
  model?: string;
  systemMessage?: string;
  documentSystemMessage?: string;
  documents?: (LlmDocument | CreateLlmDocument)[] | LlmDocumentCollection;
  tools?: LlmToolKit | (LlmTool | LlmToolConfiguration)[];
  toolChoice?: LlmToolChoice;
  maxToolCalls?: number;
  maxToolCallErrors?: number;
  context?: LLmToolContextSegment;
  secureContext?: LLmToolContextSegment;
  messageHistory?: LlmMessage[];
  json?: boolean | JsonSpecification;
  jsonDescription?: string;
}

export interface JorElJsonGenerationConfigWithTools extends Omit<JorElTextGenerationConfigWithTools, "json"> {
  jsonSchema?: JsonSpecification;
}

export interface JorElMessagesGenerationConfig extends JorElCoreGenerationConfig {
  model?: string;
  tools?: LlmToolKit | (LlmTool | LlmToolConfiguration)[];
  toolChoice?: LlmToolChoice;
  maxToolCalls?: number;
  maxToolCallErrors?: number;
  context?: LLmToolContextSegment;
  secureContext?: LLmToolContextSegment;
}

export interface JorElMessagesJsonGenerationConfig extends Omit<JorElMessagesGenerationConfig, "json"> {
  jsonSchema?: JsonSpecification;
}

export interface JorElGenerationConfigWithTools extends JorElCoreGenerationConfig {
  model?: string;
  tools?: LlmToolKit;
  toolChoice?: LlmToolChoice;
  maxToolCalls?: number;
  maxToolCallErrors?: number;
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
 * Type guard to check if input is an array of LlmMessage objects
 * @internal
 */
function isLlmMessageArray(input: JorElTaskInput | LlmMessage[]): input is LlmMessage[] {
  return Array.isArray(input) && input.length > 0 && typeof input[0] === "object" && "role" in input[0];
}

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
    register: (params: {
      model: string;
      provider: string;
      setAsDefault?: boolean;
      defaults?: ModelSpecificDefaults;
    }) => {
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
    setModelSpecificDefaults: (model: string, defaults: ModelSpecificDefaults) =>
      this._core.modelManager.setModelSpecificDefaults(model, defaults),
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
    registerAnthropic: (config?: AnthropicConfig, withoutInitialModels?: boolean) => {
      const provider = new AnthropicProvider(config);
      this._core.providerManager.registerProvider(provider.name, provider);
      if (!withoutInitialModels) {
        const defaultModels = config?.bedrock ? initialAnthropicBedrockModels : initialAnthropicModels;
        for (const model of defaultModels) {
          this.models.register({ model, provider: provider.name });
        }
      }
    },
    registerGoogleGenAi: (config?: GoogleGenerativeAIConfig, withoutInitialModels?: boolean) => {
      const provider = new GoogleGenerativeAIProvider(config);
      this._core.providerManager.registerProvider(provider.name, provider);
      if (!withoutInitialModels) {
        for (const model of initialGoogleGenAiModels) {
          this.models.register({ model, provider: provider.name });
        }
      }
    },
    registerGrok: (config?: OpenAIConfig, withoutInitialModels?: boolean) => {
      const provider = new GrokProvider(config);
      this._core.providerManager.registerProvider(provider.name, provider);
      if (!withoutInitialModels) {
        for (const model of initialGrokModels) {
          this.models.register({ model, provider: provider.name });
        }
      }
    },
    registerGroq: (config?: GroqConfig, withoutInitialModels?: boolean) => {
      const provider = new GroqProvider(config);
      this._core.providerManager.registerProvider(provider.name, provider);
      if (!withoutInitialModels) {
        for (const model of initialGroqModels) {
          this.models.register({ model, provider: provider.name });
        }
      }
    },
    registerMistral: (config?: MistralConfig, withoutInitialModels?: boolean) => {
      const provider = new MistralProvider(config);
      this._core.providerManager.registerProvider(provider.name, provider);
      if (!withoutInitialModels) {
        for (const model of initialMistralAiModels) {
          this.models.register({ model, provider: provider.name });
        }
        for (const { model, dimensions } of initialMistralAiEmbeddingModels) {
          this.models.embeddings.register({ model, dimensions, provider: provider.name });
        }
      }
    },
    registerOllama: (config?: OllamaConfig) => {
      const provider = new OllamaProvider(config);
      this._core.providerManager.registerProvider(provider.name, provider);
    },
    registerOpenAi: (config?: OpenAIConfig, withoutInitialModels?: boolean) => {
      const provider = new OpenAIProvider(config);
      this._core.providerManager.registerProvider(provider.name, provider);
      if (!withoutInitialModels) {
        for (const model of initialOpenAiModels) {
          this.models.register({ model, provider: provider.name });
        }
        for (const { model, dimensions } of initialOpenAiEmbeddingModels) {
          this.models.embeddings.register({ model, dimensions, provider: provider.name });
        }
      }
    },
    registerOpenAiAzure: (config?: Omit<OpenAiAzureConfig, "azure">) => {
      const provider = new OpenAIProvider({ ...config, azure: true });
      this._core.providerManager.registerProvider(provider.name, provider);
    },
    registerOpenRouter: (config?: OpenAIConfig, withoutInitialModels?: boolean) => {
      const provider = new OpenRouterProvider(config);
      this._core.providerManager.registerProvider(provider.name, provider);
      if (!withoutInitialModels) {
        for (const model of initialOpenRouterModels) {
          this.models.register({ model, provider: provider.name });
        }
      }
    },
    registerGoogleVertexAi: (config?: GoogleVertexAiConfig, withoutInitialModels?: boolean) => {
      const provider = new GoogleVertexAiProvider(config);
      this._core.providerManager.registerProvider(provider.name, provider);
      if (!withoutInitialModels) {
        for (const model of initialVertexAiModels) {
          this.models.register({ model, provider: provider.name });
        }
      }
    },
    anthropic: {
      addModel: (model: string, setAsDefault?: boolean, defaults?: ModelSpecificDefaults) =>
        this.models.register({ model, provider: AnthropicProvider.defaultName, setAsDefault, defaults }),
      getClient: () =>
        (this._core.providerManager.getProvider(AnthropicProvider.defaultName) as AnthropicProvider).client,
    },
    googleGenAi: {
      addModel: (model: string, setAsDefault?: boolean, defaults?: ModelSpecificDefaults) =>
        this.models.register({ model, provider: GoogleGenerativeAIProvider.defaultName, setAsDefault, defaults }),
      getClient: () =>
        (this._core.providerManager.getProvider(GoogleGenerativeAIProvider.defaultName) as GoogleGenerativeAIProvider)
          .client,
    },
    grok: {
      addModel: (model: string, setAsDefault?: boolean, defaults?: ModelSpecificDefaults) =>
        this.models.register({ model, provider: GrokProvider.defaultName, setAsDefault, defaults }),
      getClient: () => (this._core.providerManager.getProvider(GrokProvider.defaultName) as GrokProvider).client,
    },
    groq: {
      addModel: (model: string, setAsDefault?: boolean, defaults?: ModelSpecificDefaults) =>
        this.models.register({ model, provider: GroqProvider.defaultName, setAsDefault, defaults }),
      getClient: () => (this._core.providerManager.getProvider(GroqProvider.defaultName) as GroqProvider).client,
    },
    mistral: {
      addModel: (model: string, setAsDefault?: boolean, defaults?: ModelSpecificDefaults) =>
        this.models.register({ model, provider: MistralProvider.defaultName, setAsDefault, defaults }),
      getClient: () => (this._core.providerManager.getProvider(MistralProvider.defaultName) as MistralProvider).client,
    },
    openAi: {
      addModel: (model: string) => this.models.register({ model, provider: OpenAIProvider.defaultName }),
      getClient: () => (this._core.providerManager.getProvider(OpenAIProvider.defaultName) as OpenAIProvider).client,
    },
    openAiAzure: {
      addModel: (model: string, setAsDefault?: boolean, defaults?: ModelSpecificDefaults) =>
        this.models.register({ model, provider: OpenAIProvider.defaultName + "-azure", setAsDefault, defaults }),
      getClient: () =>
        (this._core.providerManager.getProvider(OpenAIProvider.defaultName + "-azure") as OpenAIProvider).client,
    },
    openRouter: {
      addModel: (model: string, setAsDefault?: boolean, defaults?: ModelSpecificDefaults) =>
        this.models.register({ model, provider: OpenRouterProvider.defaultName, setAsDefault, defaults }),
      getClient: () =>
        (this._core.providerManager.getProvider(OpenRouterProvider.defaultName) as OpenRouterProvider).client,
    },
    vertexAi: {
      addModel: (model: string, setAsDefault?: boolean, defaults?: ModelSpecificDefaults) =>
        this.models.register({ model, provider: GoogleVertexAiProvider.defaultName, setAsDefault, defaults }),
      getClient: () =>
        (this._core.providerManager.getProvider(GoogleVertexAiProvider.defaultName) as GoogleVertexAiProvider).client,
    },
  };

  /**
   * Create a new Jor-El instance.
   *
   * @param config - The configuration for the Jor-El instance.
   * @param config.anthropic - Anthropic configuration (optional).
   * @param config.googleGenAi - Google Generative AI configuration (optional).
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
    if (config.googleGenAi)
      this.providers.registerGoogleGenAi(config.googleGenAi === true ? undefined : config.googleGenAi);
    if (config.grok) this.providers.registerGrok(config.grok === true ? undefined : config.grok);
    if (config.groq) this.providers.registerGroq(config.groq === true ? undefined : config.groq);
    if (config.mistral) this.providers.registerMistral(config.mistral === true ? undefined : config.mistral);
    if (config.vertexAi) this.providers.registerGoogleVertexAi(config.vertexAi === true ? undefined : config.vertexAi);
    if (config.ollama) this.providers.registerOllama(config.ollama === true ? undefined : config.ollama);
    if (config.openAI) this.providers.registerOpenAi(config.openAI === true ? undefined : config.openAI);
    if (config.openAiAzure)
      this.providers.registerOpenAiAzure(config.openAiAzure === true ? undefined : config.openAiAzure);
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
  /**
   * Generate a response for a given set of messages.
   *
   * @param messages - The messages to generate a response for.
   * @param config - Configuration for the specific generation.
   * @param includeMeta - Whether to include the metadata and all previous messages in the response.
   * @returns The text response, or an object with the response, metadata, and messages.
   */
  async text(messages: LlmMessage[], config?: JorElMessagesGenerationConfig, includeMeta?: false): Promise<string>;
  async text(
    messages: LlmMessage[],
    config?: JorElMessagesGenerationConfig,
    includeMeta?: true,
  ): Promise<LlmTextResponseWithMeta>;
  async text(
    taskOrMessages: JorElTaskInput | LlmMessage[],
    config: JorElTextGenerationConfigWithTools | JorElMessagesGenerationConfig = {},
    includeMeta = false,
  ): Promise<string | LlmTextResponseWithMeta> {
    let _messages: LlmMessage[];

    if (isLlmMessageArray(taskOrMessages)) {
      _messages = taskOrMessages;
    } else {
      const taskConfig = config as JorElTextGenerationConfigWithTools;
      const { systemMessage, documents, documentSystemMessage, messageHistory } = taskConfig;
      _messages = await this.generateMessages(
        taskOrMessages,
        systemMessage,
        documents,
        documentSystemMessage,
        messageHistory,
      );
    }

    const _config: JorElGenerationConfigWithTools = {
      ...config,
      tools: config.tools
        ? config.tools instanceof LlmToolKit
          ? config.tools
          : new LlmToolKit(config.tools)
        : undefined,
    };
    const { output, messages, stopReason } = await this._core.generateAndProcessTools(_messages, _config);
    const response = output.content || "";
    const meta = output.meta;
    return includeMeta ? { response, meta, messages, stopReason } : response;
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
  /**
   * Generate a JSON response for a given set of messages.
   *
   * @param messages - The messages to generate a response for.
   * @param config - Configuration for the specific generation.
   * @param includeMeta - Whether to include the metadata and all previous messages in the response.
   * @returns The JSON response, or an object with the response, metadata, and messages.
   * @throws Error - If the response is not valid JSON.
   */
  async json(messages: LlmMessage[], config?: JorElMessagesJsonGenerationConfig, includeMeta?: false): Promise<object>;
  async json(
    messages: LlmMessage[],
    config?: JorElMessagesJsonGenerationConfig,
    includeMeta?: true,
  ): Promise<LlmJsonResponseWithMeta>;
  async json(
    taskOrMessages: JorElTaskInput | LlmMessage[],
    config: JorElJsonGenerationConfigWithTools | JorElMessagesJsonGenerationConfig = {},
    includeMeta = false,
  ): Promise<object | LlmJsonResponseWithMeta> {
    let _messages: LlmMessage[];
    let jsonSchema: JsonSpecification | boolean;

    if (isLlmMessageArray(taskOrMessages)) {
      _messages = taskOrMessages;
      jsonSchema = (config as JorElMessagesJsonGenerationConfig).jsonSchema || true;
    } else {
      const taskConfig = config as JorElJsonGenerationConfigWithTools;
      const { systemMessage, documents, documentSystemMessage, messageHistory } = taskConfig;
      _messages = await this.generateMessages(
        taskOrMessages,
        systemMessage,
        documents,
        documentSystemMessage,
        messageHistory,
      );
      jsonSchema = taskConfig.jsonSchema || true;
    }

    const _config: JorElGenerationConfigWithTools = {
      ...config,
      json: jsonSchema,
      tools: config.tools
        ? config.tools instanceof LlmToolKit
          ? config.tools
          : new LlmToolKit(config.tools)
        : undefined,
    };
    const { output, messages, stopReason } = await this._core.generateAndProcessTools(_messages, _config);
    const parsed = output.content ? LlmToolKit.deserialize(output.content) : {};
    return includeMeta ? { response: parsed, meta: output.meta, messages, stopReason } : parsed;
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
   * Generate a stream of response chunks for a given task or set of messages.
   *
   * @param taskOrMessages - The task to generate a response for (either a string or an array of strings and ImageContent objects) or an array of messages.
   * @param config - Configuration for the specific generation.
   */
  async *stream(
    taskOrMessages: JorElTaskInput | LlmMessage[],
    config: JorElTextGenerationConfigWithTools | JorElMessagesGenerationConfig = {},
  ): AsyncGenerator<string, void, unknown> {
    const stream = this.streamWithMeta(taskOrMessages, config);
    for await (const chunk of stream) {
      if (chunk.type === "chunk" && chunk.content) yield chunk.content;
    }
  }

  /**
   * Generate a stream of response chunks for a given task or set of messages with metadata.
   *
   * @param taskOrMessages - The task to generate a response for (either a string or an array of strings and ImageContent objects) or an array of messages.
   * @param config - Configuration for the specific generation.
   */
  async *streamWithMeta(
    taskOrMessages: JorElTaskInput | LlmMessage[],
    config: JorElTextGenerationConfigWithTools | JorElMessagesGenerationConfig = {},
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
    let messages: LlmMessage[];

    if (isLlmMessageArray(taskOrMessages)) {
      messages = taskOrMessages;
    } else {
      const taskConfig = config as JorElTextGenerationConfigWithTools;
      const { systemMessage, documents, documentSystemMessage, messageHistory } = taskConfig;
      messages = await this.generateMessages(
        taskOrMessages,
        systemMessage,
        documents,
        documentSystemMessage,
        messageHistory,
      );
    }

    const _config = {
      ...config,
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
          yield { type: "messages", messages, stopReason: "completed" };
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
   * Process approved tool calls in messages and return updated messages.
   * This method is useful when you have messages with approved tool calls that need to be executed.
   *
   * @param messages - The messages containing tool calls to process.
   * @param config - Configuration for tool call processing.
   * @param config.tools - The tools to use for processing (required).
   * @param config.context - Context to pass to tool executors (optional).
   * @param config.secureContext - Secure context to pass to tool executors (optional).
   * @param config.maxErrors - Maximum number of tool call errors allowed (optional, defaults to 3).
   * @param config.maxCalls - Maximum number of tool calls to process (optional, defaults to 5).
   * @returns Updated messages with processed tool calls.
   */
  async processToolCalls(
    messages: LlmMessage[],
    config: {
      tools: LlmToolKit | (LlmTool | LlmToolConfiguration)[];
      context?: LLmToolContextSegment;
      secureContext?: LLmToolContextSegment;
      maxErrors?: number;
      maxCalls?: number;
    },
  ): Promise<LlmMessage[]> {
    const tools = config.tools instanceof LlmToolKit ? config.tools : new LlmToolKit(config.tools);

    // Find the latest message with tool calls that need processing
    const messageWithToolCalls = messages
      .slice()
      .reverse()
      .find(
        (message): message is LlmAssistantMessageWithToolCalls =>
          message.role === "assistant_with_tools" &&
          message.toolCalls.some((call) => call.executionState === "pending"),
      );

    if (!messageWithToolCalls) {
      this.logger.debug("JorEl", "No pending tool calls found to process");
      return messages;
    }

    this.logger.debug("JorEl", "Processing pending tool calls");

    // Process the tool calls
    const processedMessage = await tools.processCalls(messageWithToolCalls, {
      context: config.context,
      secureContext: config.secureContext,
      maxErrors: config.maxErrors || 3,
      maxCalls: config.maxCalls || 5,
    });

    this.logger.debug("JorEl", "Finished processing pending tool calls");

    return messages.map((msg) => {
      if (msg.id === processedMessage.id) {
        return processedMessage;
      }
      return msg;
    });
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
