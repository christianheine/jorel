import { LogService } from "../logger";
import { ReasoningEffort, Verbosity } from "../providers";

export interface ModelSpecificDefaults {
  temperature?: number | null;
  reasoningEffort?: ReasoningEffort;
  verbosity?: Verbosity;
}

export interface ModelEntry {
  model: string;
  provider: string;
  defaults?: ModelSpecificDefaults;
}

/**
 * Manages models for JorEl
 */
export class JorElModelManager {
  private models: ModelEntry[] = [];
  private embeddingModels: { model: string; provider: string; dimensions: number }[] = [];
  private defaultModel: string = "";
  private defaultEmbeddingModel: string = "";

  constructor(private logger: LogService) {
    this.logger.debug("ModelManager", "Model manager initialized");
  }

  /**
   * Register a model for an existing provider
   * @param model The model name
   * @param provider The provider name
   * @param setAsDefault Whether to set this model as the default
   * @returns The model entry
   * @throws Error - If the provider does not exist
   */
  registerModel({
    model,
    provider,
    setAsDefault,
    defaults,
  }: {
    model: string;
    provider: string;
    setAsDefault?: boolean;
    defaults?: ModelSpecificDefaults;
  }) {
    this.models.push({ model, provider, defaults });
    this.logger.debug("ModelManager", `Registered model ${model} with provider ${provider}`);
    if (setAsDefault || !this.defaultModel) this.defaultModel = model;
  }

  /**
   * Set the defaults for a model
   * @param model The model name
   * @param defaults The defaults to set
   */
  setModelSpecificDefaults(model: string, defaults: ModelSpecificDefaults) {
    const modelEntry = this.getModel(model);
    modelEntry.defaults = defaults;
    this.logger.debug("ModelManager", `Set specific defaults for model ${model} to ${JSON.stringify(defaults)}`);
  }

  /**
   * Unregister a model
   * @param model The model name
   */
  unregisterModel(model: string) {
    this.models = this.models.filter((m) => m.model !== model);
    this.logger.debug("ModelManager", `Unregistered model ${model}`);
    if (this.defaultModel === model) {
      this.defaultModel = this.models.length ? this.models[0].model : "";
      this.logger.debug("ModelManager", `Set default model to ${this.defaultModel}`);
    }
  }

  /**
   * Get a model entry
   * @param model The model name
   * @returns The model entry
   * @throws Error - If the model does not exist
   */
  getModel(model: string): ModelEntry {
    const modelEntry = this.models.find((m) => m.model === model);
    if (!modelEntry) throw new Error(`Model ${model} is not registered`);
    return modelEntry;
  }

  /**
   * Get the default model
   * @returns The default model id
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Set the default model
   * @param model The model name
   * @throws Error - If the model does not exist
   */
  setDefaultModel(model: string) {
    this.getModel(model); // Ensure model exists
    this.defaultModel = model;
    this.logger.debug("ModelManager", `Set default model to ${model}`);
  }

  /**
   * List all models
   */
  listModels(): ModelEntry[] {
    return this.models;
  }

  /**
   * Register an embedding model for an existing provider
   * @param model The model name
   * @param provider The provider name
   * @param dimensions The number of dimensions
   * @param setAsDefault Whether to set this model as the default
   * @returns The model entry
   * @throws Error - If the provider does not exist
   */
  registerEmbeddingModel({
    model,
    provider,
    dimensions,
    setAsDefault,
  }: {
    model: string;
    provider: string;
    dimensions: number;
    setAsDefault?: boolean;
  }) {
    this.embeddingModels.push({ model, provider, dimensions });
    this.logger.debug("ModelManager", `Registered embedding model ${model} with provider ${provider}`);
    if (setAsDefault || !this.defaultEmbeddingModel) {
      this.defaultEmbeddingModel = model;
      this.logger.debug("ModelManager", `Set default embedding model to ${model}`);
    }
  }

  /**
   * Unregister an embedding model
   * @param model The model name
   */
  unregisterEmbeddingModel(model: string) {
    this.embeddingModels = this.embeddingModels.filter((m) => m.model !== model);
    this.logger.debug("ModelManager", `Unregistered embedding model ${model}`);
    if (this.defaultEmbeddingModel === model) {
      this.defaultEmbeddingModel = this.embeddingModels.length ? this.embeddingModels[0].model : "";
      this.logger.debug("ModelManager", `Set default embedding model to ${this.defaultEmbeddingModel}`);
    }
  }

  /**
   * Get an embedding model entry
   * @param model The model name
   * @returns The model entry
   * @throws Error - If the model does not exist
   */
  getEmbeddingModel(model: string): { model: string; provider: string } {
    const modelEntry = this.embeddingModels.find((m) => m.model === model);
    if (!modelEntry) throw new Error(`Model ${model} is not registered`);
    return modelEntry;
  }

  /**
   * Get the default embedding model
   * @returns The default model id
   */
  getDefaultEmbeddingModel(): string {
    return this.defaultEmbeddingModel;
  }

  /**
   * Set the default embedding model
   * @param model The model name
   * @throws Error - If the model does not exist
   */
  setDefaultEmbeddingModel(model: string) {
    this.getEmbeddingModel(model); // Ensure model exists
    this.defaultEmbeddingModel = model;
    this.logger.debug("ModelManager", `Set default embedding model to ${model}`);
  }

  /**
   * List all embedding models
   * @returns The list of embedding models
   */
  listEmbeddingModels(): { model: string; provider: string }[] {
    return this.embeddingModels;
  }
}
