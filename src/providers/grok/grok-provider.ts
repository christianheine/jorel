import { OpenAIConfig, OpenAIProvider } from "../open-ai";

export class GrokProvider extends OpenAIProvider {
  constructor(config?: OpenAIConfig) {
    super({
      apiUrl: "https://api.x.ai/v1",
      apiKey: process.env.GROK_API_KEY,
      name: "grok",
      ...config,
    });
  }
}
