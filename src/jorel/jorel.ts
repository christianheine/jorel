import {JorElProviderManager} from "./providers";
import {JorElModelManager} from "./models";
import {OpenAIConfig, OpenAIProvider} from "../open-ai";
import {generateMessage, LlmCoreProvider, LlmGenerationConfig, LlmMessage} from "../shared";
import {OllamaConfig, OllamaProvider} from "../ollama";

interface InitialConfig {
  openAI?: OpenAIConfig;
  ollama?: OllamaConfig;
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

const defaultOpenAiModels: string[] = [
  "gpt-4o-mini",
  "gpt-4o",
];

/**
 * Jor-El: Singular interface for managing multiple LLM providers and models
 */
export class JorEl {
  private providerManager = new JorElProviderManager();
  private modelManager = new JorElModelManager();

  private defaultConfig: LlmGenerationConfig = {};

  /** System message use for all requests by default (unless specified per request) */
  public systemMessage;

  /**
   * Create a new Jor-El instance
   * @param config
   * @param config.openAI OpenAI configuration (optional)
   * @param config.systemMessage System message to include in all requests (optional)
   * @param config.temperature Default temperature for all requests (optional)
   */
  constructor(config: InitialConfig = {}) {
    if (config.openAI) this.providers.registerOpenAi(config.openAI);
    if (config.ollama) this.providers.registerOllama(config.ollama);
    this.systemMessage = config.systemMessage || "";
    if (config.temperature !== undefined) this.defaultConfig.temperature = config.temperature;
  }

  /** Public methods for managing providers */
  public providers = {
    list: () => this.providerManager.listProviders(),
    registerCustom: (provider: string, coreProvider: LlmCoreProvider) => this.providerManager.registerProvider(provider, coreProvider),
    registerOpenAi: (config: OpenAIConfig) => {
      this.providerManager.registerProvider("openai", new OpenAIProvider(config));
      for (const model of defaultOpenAiModels) {
        this.models.register({model, provider: "openai"});
      }
    },
    registerOllama: (config: OllamaConfig) => {
      this.providerManager.registerProvider("ollama", new OllamaProvider(config));
    }
  };

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

  /**
   * Generate a response for a given set of messages
   * @param messages
   * @param config
   * @param json
   */
  async generate(messages: LlmMessage[], config: JorElAskGenerationConfig = {}, json?: boolean) {
    const modelEntry = this.modelManager.getModel(config.model || this.modelManager.getDefaultModel());
    const provider = this.providerManager.getProvider(modelEntry.provider);
    const response = await provider.generateResponse(modelEntry.model, messages, {
      ...this.defaultConfig,
      ...config,
      json
    });
    return {
      response: response.content,
      messages: [...messages, {role: "assistant", content: response.content}],
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
   */
  async ask(task: string, config: JorElAskGenerationConfig = {}) {
    const {response} = await this.generate(generateMessage(task, config.systemMessage || this.systemMessage), config);
    return response;
  }

  /**
   * Generate a stream of response chunks for a given task
   * @param task
   * @param config
   */
  async* stream(task: string, config: JorElAskGenerationConfig = {}) {
    const stream = this.generateContentStream(generateMessage(task, config.systemMessage || this.systemMessage), config);
    for await (const chunk of stream) {
      yield chunk.content;
    }
  }

  /**
   * Generate a JSON response for a given task
   * @param task
   * @param config
   * @returns The JSON response
   * @throws If the response is not valid JSON
   */
  async json(task: string, config: JorElAskGenerationConfig = {}) {
    const {response} = await this.generate(generateMessage(task, config.systemMessage || this.systemMessage), config, true);
    return JSON.parse(response);
  }
}
