/**
 * Manages models for JorEl
 */
export class JorElModelManager {
  private models: { model: string; provider: string }[] = [];
  private defaultModel: string = "";

  /**
   * Register a model for an existing provider
   * @param model The model name
   * @param provider The provider name
   * @param setAsDefault Whether to set this model as the default
   * @returns The model entry
   * @throws If the provider does not exist
   */
  registerModel({model, provider, setAsDefault}: { model: string; provider: string; setAsDefault?: boolean }) {
    this.models.push({model, provider});
    if (setAsDefault || !this.defaultModel) this.defaultModel = model;
  }

  /**
   * Unregister a model
   * @param model The model name
   */
  unregisterModel(model: string) {
    this.models = this.models.filter((m) => m.model !== model);
    if (this.defaultModel === model) {
      this.defaultModel = this.models.length ? this.models[0].model : "";
    }
  }

  /**
   * Get a model entry
   * @param model The model name
   * @returns The model entry
   * @throws If the model does not exist
   */
  getModel(model: string): { model: string; provider: string } {
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
   * @throws If the model does not exist
   */
  setDefaultModel(model: string) {
    this.getModel(model); // Ensure model exists
    this.defaultModel = model;
  }

  /**
   * List all models
   */
  listModels(): { model: string; provider: string }[] {
    return this.models;
  }
}
