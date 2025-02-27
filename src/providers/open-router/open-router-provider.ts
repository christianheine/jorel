import { OpenAIConfig, OpenAIProvider } from "../open-ai";

export class OpenRouterProvider extends OpenAIProvider {
  constructor(config?: OpenAIConfig) {
    super({
      apiUrl: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPEN_ROUTER_API_KEY,
      name: "open-router",
      ...config,
    });
  }
}
