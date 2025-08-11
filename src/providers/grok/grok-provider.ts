import { OpenAIConfig, OpenAIProvider } from "../open-ai";

export class GrokProvider extends OpenAIProvider {
  static readonly defaultName = "grok";

  constructor(config?: OpenAIConfig) {
    super({
      apiUrl: "https://api.x.ai/v1",
      apiKey: process.env.GROK_API_KEY,
      name: GrokProvider.defaultName,
      ...config,
    });
  }
}
