---
sidebar_position: 2
---

# Initialization

## Creating the JorEl instance

To use JorEl, you first need to create an instance of the `JorEl` class. This class is the main entry point for almost all interactions with JorEl.

```typescript
import { JorEl } from "jorel";

const jorel = new JorEl({/* Configuration options */ });
```

### Configuration options

The `JorEl` constructor takes an optional configuration object. The following options are available:

* `anthropic`
    + Configuration for the Anthropic provider.
    + You can either pass an apiKey or set it to `true` to use the `ANTHROPIC_API_KEY` environment variable.
* `grok`
    + Configuration for the Grok provider.
    + You can either pass an apiKey or set it to `true` to use the `GROK_API_KEY` environment variable.
* `groq`
    + Configuration for the Groq provider.
    + You can either pass an apiKey or set it to `true` to use the `GROQ_API_KEY` environment variable.
* `mistral`
    + `Configuration for the Mistral provider.
    + You can either pass an apiKey or set it to `true` to use the `MISTRAL_API_KEY` environment variable.
* `ollama`:
    + Configuration for the Ollama provider.
    + There is no need for an API key. You can also just set it to `true`.
* `openAI`
    + Configuration for the OpenAI provider.
    + You can either pass an apiKey or set it to `true` to use the `OPENAI_API_KEY` environment variable.
* `vertexAi`
    + Configuration for the Google Vertex AI provider.
    + You can set it to `true` to use the `GCP_PROJECT`,       `GCP_LOCATION`, and `GOOGLE_APPLICATION_CREDENTIALS` environment variables.
* `systemMessage`
    + The default system message to use for all requests using the `text`,  `json` or `stream` methods.
    + Can be overridden on a per-request basis.
* `documentSystemMessage`

    + The default system message to use for all requests using the `text`,  `json` or `stream` methods.
    + Can also be overridden on a per-request basis.
* `temperature`
    + The default temperature to use for all requests using the `text`,  `json` or `stream` methods.
    + Defaults to 0.
    + Set it to null, in order explicitly use not default temperature.
    + Can also be overridden on a per-request basis (including the null setting)
* `logger`
    + The logger to use for logging messages.
    + You can either pass a function or a Winston instance or set it to `console` to use the default logger.
    + Defaults to "console".
* `logLevel`
    + The log level to use for logging messages.
    + To prevent logging, set it to `silent`.
    + Defaults to `info`.

### Basic example:

```typescript
const jorel = new JorEl({
  openAI: true,
  anthropic: true,
  systemMessage: "You are a helpful assistant who answers concisely."
});
```

### Full example:

```typescript
const jorel = new JorEl({
  openAI: { apiKey: process.env.OPENAI_API_KEY },
  anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
  groq: { apiKey: process.env.GROQ_API_KEY },
  grok: { apiKey: process.env.GROK_API_KEY },
  vertexAi: true,
  ollama: true,
  mistral: true,
  systemMessage: "You are a helpful assistant who answers concisely.",
  documentSystemMessage: "You can refer to the following documents: {{documents}}",
  temperature: 0.5,
  logger: "console",
  logLevel: "verbose",
});
```

All of the above can also be set later.

```typescript
jorEl.systemMessage = "You are a helpful assistant who answers concisely.";
jorEl.documentSystemMessage = "You can refer to the following documents: {{documents}}";
jorEl.temperature = 0.5;
jorEl.logger = "console";
jorEl.logLevel = "verbose";
```

## Registering providers

You can register providers after initializing the `JorEl` instance using the `register` methods on the `providers` property of the `JorEl` instance.

```typescript
jorEl.providers.registerAnthropic({ apiKey });
jorEl.providers.registerGrok({ apiKey });
jorEl.providers.registerGroq({ apiKey });
jorEl.providers.registerVertexAi({ project, location, keyFilename });
jorEl.providers.registerOllama({});
jorEl.providers.registerOpenAi({ apiKey });
jorEl.providers.registerMistral({ apiKey });
```

You can list all registered providers using the `list` method.

```typescript
jorEl.providers.list();
```

## Working with models

### Registering models

JorEl ships with a set of default models for each provider, but you can also register additional models afterwards. This is especially useful when using Ollama or a custom provider.

```typescript
jorEl.models.register({ model: "llama3.2", provider: "ollama" });
```

Note that model names must be unique (across providers). This is because JorEl only uses the model name to find the model across all providers.

To unregister a model, use the `unregister` method.

```typescript
jorEl.models.unregister("llama3.2");
```

For native providers, you can also add models using a shorthand method.

```typescript
jorEl.providers.openAi.addModel("gpt-4o-mini");
```

### Listing models

You can list all registered models using the `list` method.

```typescript
jorEl.models.list();
```

### Registering embedding models

You can also easily register embedding models. They take an additional `dimensions` parameter.

```typescript
jorEl.models.embeddings.register({ model: "text-embedding-ada-002", provider: "openai", dimensions: 1536 });
```

To unregister an embedding model, use the `unregister` method.

```typescript
jorEl.models.embeddings.unregister("text-embedding-ada-002");
```
