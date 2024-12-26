import {LlmCoreProvider} from "../shared";

/**
 *  Manages LLM providers for JorEl
 */
export class JorElProviderManager {
  private providers: { [provider: string]: LlmCoreProvider } = {};

  /** Register a new LLM provider */
  registerProvider(provider: string, coreProvider: LlmCoreProvider) {
    if (this.providers[provider]) throw new Error(`Provider ${provider} is already registered`);
    this.providers[provider] = coreProvider;
  }

  /** Get a registered LLM provider */
  getProvider(provider: string): LlmCoreProvider {
    const coreProvider = this.providers[provider];
    if (!coreProvider) throw new Error(`Provider ${provider} is not registered`);
    return coreProvider;
  }

  /** List all registered LLM provider ids */
  listProviders(): string[] {
    return Object.keys(this.providers);
  }
}
