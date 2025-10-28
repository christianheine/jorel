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

  generateResponse(
    model: string, 
    messages: LlmMessage[], 
    config?: LlmGenerationConfig
  ): Promise<LlmResponse>;

  generateResponseStream(
    model: string,
    messages: LlmMessage[],
    config?: LlmGenerationConfig,
  ): AsyncGenerator<
    | LlmStreamResponseChunk 
    | LlmStreamResponse 
    | LlmStreamResponseWithToolCalls
    | LlmStreamToolCallStarted
    | LlmStreamToolCallCompleted, 
    void, 
    unknown
  >;

  getAvailableModels(): Promise<string[]>;

  createEmbedding(model: string, text: string, abortSignal?: AbortSignal): Promise<number[]>;
}
```

The LlmGenerationConfig interface is defined as follows:

```typescript
import { LogService, LogLevel, LlmToolKit, LlmToolChoice, ReasoningEffort, Verbosity, StreamBufferConfig } from "jorel";

interface LlmGenerationConfig {
  temperature?: number | null;
  maxTokens?: number;
  json?: boolean | JsonSpecification;
  jsonDescription?: string;
  tools?: LlmToolKit;
  toolChoice?: LlmToolChoice;
  reasoningEffort?: ReasoningEffort;
  verbosity?: Verbosity;
  streamBuffer?: StreamBufferConfig;
  abortSignal?: AbortSignal;
  logLevel?: LogLevel;
  logger?: LogService;
}
```

## Available providers

JorEl ships with the following providers:
* `AnthropicProvider`
* `GoogleGenerativeAIProvider`
* `GoogleVertexAiProvider`
* `GrokProvider`
* `GroqProvider`
* `MistralProvider`
* `OllamaProvider`
* `OpenAIProvider`
* `OpenRouterProvider`
