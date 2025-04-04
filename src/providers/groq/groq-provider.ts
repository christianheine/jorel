import { OpenAIConfig, OpenAIProvider } from "../open-ai";

export class GroqProvider extends OpenAIProvider {
  constructor(config?: OpenAIConfig) {
    super({
      apiUrl: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
      name: "groq",
      ...config,
    });
  }
}
