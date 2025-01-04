import {JorElProviderManager} from "./providers";
import {JorElModelManager} from "./models";
import {AnthropicConfig, AnthropicProvider, defaultAnthropicBedrockModels, defaultAnthropicModels, defaultGrokModels, defaultGroqModels, defaultOpenAiModels, defaultVertexAiModels, GoogleVertexAiConfig, GoogleVertexAiProvider, GrokProvider, GroqConfig, GroqProvider, OllamaConfig, OllamaProvider, OpenAIConfig, OpenAIProvider} from "../providers";
import {_systemMessage, _userMessage, LlmCoreProvider, LlmGenerationConfig, LlmMessage, LlmResponseMetaData, LlmToolChoice} from "../shared";
import {ImageContent} from "../media";
import {LlmToolKit} from "../tools/llm-tool-kit";

interface InitialConfig {
  anthropic?: AnthropicConfig;
  grok?: OpenAIConfig;
  groq?: GroqConfig;
  ollama?: OllamaConfig;
  openAI?: OpenAIConfig;
  vertexAi?: GoogleVertexAiConfig;
  systemMessage?: string;
  temperature?: number;
}

interface JorElCoreGenerationConfig {
  temperature?: number;
}

interface JorElAskGenerationConfig extends JorElCoreGenerationConfig {
  model?: string;
  systemMessage?: string;
}

interface JorElAskGenerationConfigWithTools extends JorElAskGenerationConfig {
  tools?: LlmToolKit;
  toolChoice?: LlmToolChoice;
}

export type JorElTaskInput = string | (string | ImageContent)[]

/**
 * Jor-El: Singular interface for managing multiple LLM providers and models
 */
export class JorEl {
  /** System message use for all requests by default (unless specified per request) */
  public systemMessage;
  private providerManager = new JorElProviderManager();
  private modelManager = new JorElModelManager();
  /** Public methods for managing models */
  public models = {
    list: () => this.modelManager.listModels(),
    register: (params: { model: string; provider: string; setAsDefault?: boolean }) => {
      this.providerManager.getProvider(params.provider); // Ensure provider exists
      return this.modelManager.registerModel(params);
    },
    unregister: (model: string) => this.modelManager.unregisterModel(model),
    getDefault: () => this.modelManager.getDefaultModel(),
    setDefault: (model: string) => this.modelManager.registerModel({model, provider: "", setAsDefault: true}),
  };
  /** Public methods for managing providers */
  public providers = {
    list: () => this.providerManager.listProviders(),
    registerCustom: (provider: string, coreProvider: LlmCoreProvider) => this.providerManager.registerProvider(provider, coreProvider),

    registerAnthropic: (config?: AnthropicConfig) => {
      this.providerManager.registerProvider("anthropic", new AnthropicProvider(config));
      const defaultModels = config?.bedrock ? defaultAnthropicBedrockModels : defaultAnthropicModels;
      for (const model of defaultModels) {
        this.models.register({model, provider: "anthropic"});
      }
    },
    registerGrok: (config?: OpenAIConfig) => {
      this.providerManager.registerProvider("grok", new GrokProvider(config));
      for (const model of defaultGrokModels) {
        this.models.register({model, provider: "grok"});
      }
    },
    registerGroq: (config?: GroqConfig) => {
      this.providerManager.registerProvider("groq", new GroqProvider(config));
      for (const model of defaultGroqModels) {
        this.models.register({model, provider: "groq"});
      }
    },
    registerOllama: (config?: OllamaConfig) => {
      this.providerManager.registerProvider("ollama", new OllamaProvider(config));
    },
    registerOpenAi: (config?: OpenAIConfig) => {
      this.providerManager.registerProvider("openai", new OpenAIProvider(config));
      for (const model of defaultOpenAiModels) {
        this.models.register({model, provider: "openai"});
      }
    },
    registerGoogleVertexAi: (config?: GoogleVertexAiConfig) => {
      this.providerManager.registerProvider("google-vertex-ai", new GoogleVertexAiProvider(config));
      for (const model of defaultVertexAiModels) {
        this.models.register({model, provider: "google-vertex-ai"});
      }
    },
  };
  private defaultConfig: LlmGenerationConfig = {};

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
   * @param config.temperature Default temperature for all requests (optional)
   */
  constructor(config: InitialConfig = {}) {
    if (config.anthropic) this.providers.registerAnthropic(config.anthropic);
    if (config.grok) this.providers.registerGrok(config.grok);
    if (config.groq) this.providers.registerGroq(config.groq);
    if (config.vertexAi) this.providers.registerGoogleVertexAi(config.vertexAi);
    if (config.ollama) this.providers.registerOllama(config.ollama);
    if (config.openAI) this.providers.registerOpenAi(config.openAI);
    this.systemMessage = config.systemMessage ?? "You are a helpful assistant.";
    if (config.temperature !== undefined) this.defaultConfig.temperature = config.temperature;
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
  async generate(messages: LlmMessage[], config: JorElAskGenerationConfigWithTools = {}, json?: boolean) {
    const modelEntry = this.modelManager.getModel(config.model || this.modelManager.getDefaultModel());
    const provider = this.providerManager.getProvider(modelEntry.provider);
    const response = await provider.generateResponse(modelEntry.model, messages, {
      ...this.defaultConfig,
      ...config,
      json
    });
    return {
      ...response,
      meta: {...response.meta, provider: modelEntry.provider},
    };
  }

  /**
   * Generate a stream of response chunks for a given set of messages
   * @param messages
   * @param config
   */
  async* generateContentStream(messages: LlmMessage[], config: JorElAskGenerationConfig = {}) {
    const modelEntry = this.modelManager.getModel(config.model || this.modelManager.getDefaultModel());
    const provider = this.providerManager.getProvider(modelEntry.provider);
    const stream = provider.generateResponseStream(modelEntry.model, messages, {
      ...this.defaultConfig,
      ...config,
    });
    yield* stream;
  }

  /**
   * Generate a response for a given task
   * @param task
   * @param config
   * @param includeMeta
   */
  async ask(task: JorElTaskInput, config?: JorElAskGenerationConfig, includeMeta?: false): Promise<string>;
  async ask(task: JorElTaskInput, config?: JorElAskGenerationConfig, includeMeta?: true): Promise<{ response: string; meta: LlmResponseMetaData }>;
  async ask(task: JorElTaskInput, config: JorElAskGenerationConfig = {}, includeMeta = false): Promise<string | { response: string; meta: LlmResponseMetaData }> {
    const generation = await this.generate(this.generateMessage(task, config.systemMessage), config);
    const response = generation.content || "";
    const meta = generation.meta;
    return includeMeta ? {response, meta} : response;
  }

  /**
   * Generate a stream of response chunks for a given task
   * @param task
   * @param config
   */
  async* stream(task: JorElTaskInput, config: JorElAskGenerationConfig = {}) {
    const stream = this.generateContentStream(this.generateMessage(task, config.systemMessage), config);
    for await (const chunk of stream) {
      yield chunk.content;
    }
  }

  /**
   * Generate a JSON response for a given task
   * @param task
   * @param config
   * @param includeMeta
   * @returns The JSON response
   * @throws Error - If the response is not valid JSON
   */
  async json(task: JorElTaskInput, config?: JorElAskGenerationConfig, includeMeta?: false): Promise<object>;
  async json(task: JorElTaskInput, config?: JorElAskGenerationConfig, includeMeta?: true): Promise<{ response: object; meta: LlmResponseMetaData }>;
  async json(task: JorElTaskInput, config: JorElAskGenerationConfig = {}, includeMeta = false): Promise<object | { response: object; meta: LlmResponseMetaData }> {
    const {content, meta} = await this.generate(this.generateMessage(task, config.systemMessage), config, true);
    if (!content) return includeMeta ? {response: {}, meta} : {};
    const parsed = content ? JSON.parse(content) : {};
    return includeMeta ? {response: parsed, meta} : parsed;
  }

  private generateMessage(content: JorElTaskInput, systemMessage?: string) {
    if (systemMessage || this.systemMessage) return [_systemMessage(systemMessage || this.systemMessage), _userMessage(content)];
    return [_userMessage(content)];
  };
}
