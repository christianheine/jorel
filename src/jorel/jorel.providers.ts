import { LlmCoreProvider } from "../providers";
import { LogService } from "../logger";

/**
 *  Manages LLM providers for JorEl
 */
export class JorElProviderManager {
  private providers: { [provider: string]: LlmCoreProvider } = {};

  constructor(private logger: LogService) {
    this.logger.debug("ProviderManager", "Provider manager initialized");
  }

  /** Register a new LLM provider */
  registerProvider(provider: string, coreProvider: LlmCoreProvider) {
    if (this.providers[provider]) throw new Error(`Provider ${provider} is already registered`);
    this.providers[provider] = coreProvider;
    this.logger.debug("ProviderManager", `Registered provider ${provider}`);
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
