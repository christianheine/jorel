---
sidebar_position: 1
---

# Using providers

Providers are the lowest layer of JorEl. They map between the various LLM APIs and JorEl's unified interface. JorEl ships with providers for OpenAI, Anthropic, Groq, Grok, Google Vertex AI, and
Ollama. You can also write your own provider to support additional LLM APIs.

## Structure of a provider

Each provider must implement the `LlmCoreProvider` interface. This interface defines the methods that JorEl uses to interact with the provider.

```typescript
interface LlmCoreProvider {
  readonly name: string;

  generateResponse(model: string, messages: CoreLlmMessage[], config?: LlmGenerationConfig): Promise<LlmResponse>;

  generateResponseStream(
    model: string,
    messages: CoreLlmMessage[],
    config?: LlmGenerationConfig,
  ): AsyncGenerator<LlmStreamResponseChunk | LlmStreamResponse | LlmStreamResponseWithToolCalls, void, unknown>;

  getAvailableModels(): Promise<string[]>;

  createEmbedding(model: string, text: string): Promise<number[]>;
}
```

The LlmGenerationConfig interface is defined as follows:

```typescript
import {LogService, LogLevel, LlmToolKit, LlmToolChoice} from "jorel";

interface LlmGenerationConfig {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  tools?: LlmToolKit;
  toolChoice?: LlmToolChoice;
  logLevel?: LogLevel;
  logger?: LogService;
}
```

## Available providers

JorEl ships with the following providers:
- `AnthropicProvider`
- `GoogleVertexAiProvider`
- `GrokProvider`
- `GroqProvider`
- `OllamaProvider`
- `OpenAIProvider`