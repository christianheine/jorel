---
sidebar_position: 2
---

# Initialization

## Creating the JorEl instance

To use JorEl, you first need to create an instance of the `JorEl` class. This class is the main entry point for almost all interactions with JorEl.

```typescript
import {JorEl} from "jorel";

const jorel = new JorEl({/* Configuration options */});
```

### Configuration options

The `JorEl` constructor takes an optional configuration object. The following options are available:

- `anthropic`
  - Configuration for the Anthropic provider. 
  - You can either pass an apiKey or set it to `true` to use the `ANTHROPIC_API_KEY` environment variable.
- `grok`
  - Configuration for the Grok provider. 
  - You can either pass an apiKey or set it to `true` to use the `GROK_API_KEY` environment variable.
- `groq`
  - Configuration for the Groq provider. 
  - You can either pass an apiKey or set it to `true` to use the `GROQ_API_KEY` environment variable.
- `ollama`: 
  - Configuration for the Ollama provider. 
  - There is no need for an API key. You can also just set it to `true`.
- `openAI`
  - Configuration for the OpenAI provider. 
  - You can either pass an apiKey or set it to `true` to use the `OPENAI_API_KEY` environment variable.
- `vertexAi`
  - Configuration for the Google Vertex AI provider. 
  - You can set it to `true` to use the `GCP_PROJECT`, `GCP_LOCATION`, and `GOOGLE_APPLICATION_CREDENTIALS` environment variables.
- `systemMessage`
  - The default system message to use for all requests using the `ask`, `json` or `stream` methods. 
  - Can be overridden on a per-request basis.
- `documentSystemMessage` 
  - The default system message to use for all requests using the `ask`, `json` or `stream` methods. 
  - Can also be overridden on a per-request basis.
- `temperature`
  - The default temperature to use for all requests using the `ask`, `json` or `stream` methods. 
  - Can also be overridden on a per-request basis. 
  - Defaults to 0.
- `logger`
  - The logger to use for logging messages. 
  - You can either pass a function or a Winston instance or set it to `console` to use the default logger. 
  - Defaults to "console".
- `logLevel`
  - The log level to use for logging messages.
  - To prevent logging, set it to `silent`.
  - Defaults to `info`.

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
  openAI: {apiKey: process.env.OPENAI_API_KEY},
  anthropic: {apiKey: process.env.ANTHROPIC_API_KEY},
  groq: {apiKey: process.env.GROQ_API_KEY},
  grok: {apiKey: process.env.GROK_API_KEY},
  vertexAi: true,
  ollama: true,
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

jorEl.providers.registerAnthropic({apiKey});
jorEl.providers.registerGrok({apiKey});
jorEl.providers.registerGroq({apiKey});
jorEl.providers.registerVertexAi({project, location, keyFilename});
jorEl.providers.registerOllama({});
jorEl.providers.registerOpenAi({apiKey});
```