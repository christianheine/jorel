# JorEl

JorEl is a lightweight, unified wrapper for interacting with multiple large language models (LLMs) such as OpenAI, Anthropic, Groq, Google, Ollama, and more.

It offers two main interfaces: a high-level interface for generating responses with a single line of code, and a low-level interface for more control over the generation process.

Apart from the unified interface, JorEl also significantly simplifies working with both images and external tools.

## Table of Contents

- [JorEl](#jorel)
    - [Features](#features)
    - [Installation](#installation)
    - [Quick start](#quick-start)
        - [Text-only usage](#text-only-usage)
        - [Prompts-with-images](#prompts-with-images)
        - [Providing documents for context/ grounding](#providing-documents-for-context-grounding)
        - [Creating embeddings](#creating-embeddings)
        - [Tool Use](#tool-use)
    - [Core Tenets](#core-tenets)
    - [Usage](#usage)
        - [Basic setup](#basic-setup)
        - [Using providers](#using-providers)
            - [Register Anthropic](#register-anthropic)
            - [Register Grok](#register-grok)
            - [Register Groq](#register-groq)
            - [Register Ollama](#register-ollama)
            - [Register OpenAI](#register-openai)
            - [Register Vertex AI (Google)](#register-vertex-ai-google)
            - [Register a custom provider](#register-a-custom-provider)
            - [List registered providers](#list-registered-providers)
        - [Using models](#using-models)
            - [List registered models](#list-registered-models)
            - [Register a model](#register-a-model)
            - [Unregister a model](#unregister-a-model)
            - [Set default model](#set-default-model)
        - [Generate responses](#generate-responses)
            - [Generate a simple response](#generate-a-simple-response)
            - [Generate a simple response with custom model and system message](#generate-a-simple-response-with-custom-model-and-system-message)
            - [Generate a response with an image](#generate-a-response-with-an-image)
            - [Generate a response stream](#generate-a-response-stream)
            - [Generate JSON output](#generate-json-output)
        - [JorEl class api, and message types](#jorel-class-api-and-message-types)
        - [Alternative usage](#alternative-usage)
            - [Directly using providers](#directly-using-providers)
    - [Examples](#examples)
    - [Roadmap](#roadmap)
    - [Contributing](#contributing)
    - [License](#license)

## Features

- Straightforward api to a range of leading language models (LLMs): OpenAI, Anthropic, Groq, Vertex AI, Ollama, Grok.
- Unified message format for interacting with different models.
- Full support for vision (images in prompts), with automatic handling of image data.
- Full support for external tools, enabling the model to invoke external tools during interactions.
- Easily provide external documents for context/ grounding.
- Access to unified providers directly for more control.

## Installation

Install JorEl via npm:

```bash
npm install jorel
```

## Quick start

### Text-only usage

```typescript
import {JorEl} from "jorel";

// Create a new JorEl instance with your chosen provider's credentials
const jorel = new JorEl({openAI: {apiKey: "your-openai-api-key"}});

// Generate a response for a text prompt
const response = await jorel.ask("What is the capital of Australia?");

console.log(response); // "Sydney"
```

### Prompts with images

```typescript
import {JorEl, ImageContent} from "jorel";

// Create a new JorEl instance with your chosen provider's credentials
const jorel = new JorEl({openAI: {apiKey: "your-openai-api-key"}});

// Load an image (from a file, buffer, url, data url, or base64 string)
const image = ImageContent.fromFile("path-to-your-image.jpg");

// Generate a response for a vision prompt
const response = await jorel.ask(["Describe this image", image]);

console.log(response); // "description of the image"
```

### Providing documents for context/ grounding

```typescript
import {JorEl} from "jorel";

const jorEl = new JorEl({openAI: true}); // Uses process.env.OPENAI_API_KEY

// Will return a string, considering the documents provided
const response = await jorEl.ask("What is the best company to get custom packaging?", {
  documents: [{
    title: "PackMojo",
    content: "PackMojo is one of the best companies worldwide to get high-quality custom printed packaging.",
    source: "https://packmojo.com",
  }]
});

console.log(response); // "Response considering the documents provided"
```

### Creating embeddings

```typescript
import { JorEl } from "jorel";

const jorEl = new JorEl({ openAI: true }); // Uses process.env.OPENAI_API_KEY

// Will return an array of numbers
const response = await jorEl.embed("Embeddings are really just numbers");

console.log(response); // [-0.002006665,  -0.03894945, 0.024507659,  0.015396313, ...]
```

### Tool Use

JorEl supports incorporating toolkits to extend the capabilities of the language model. This allows the model to invoke external tools during interactions, enabling tasks
such as fetching weather data, querying databases, or any other custom functionality.

#### Setting up Tool Use

To use tools, define a toolkit with the required tools and pass it to the `ask`, `json` or `generate` methods.

A tool should include:

- `name`: A unique name for the tool.
- `description`: A description of what the tool does.
- `executor`: A function that executes the tool's logic.
- `params`: A JSON schema defining the parameters the tool accepts.

Example:

```typescript
const jorEl = new JorEl({
  openAI: {apiKey: process.env.OPENAI_API_KEY},
});

const tools = new LlmToolKit([
  {
    name: "get_stock_data",
    description: "Get stock data for a given ticker symbol (previous day)",
    executor: getStockValue, // Requires Polygon.io API key
    params: {
      type: "object",
      properties: {
        tickerSymbol: {type: "string"},
      },
      required: ["tickerSymbol"],
    }
  },
  {
    name: "get_weather",
    description: "Get the current temperature and conditions for a city",
    executor: getWeather, // Requires a Weather API key
    params: {
      type: "object",
      properties: {
        city: {type: "string"},
      },
      required: ["city"],
    }
  }]);

const response = await jorEl.ask("What is the current stock price for Amazon, and the weather in Sydney?", {tools});

console.log(response);
// The current stock price for Amazon (AMZN) is $224.19.
// In Sydney, the weather is partly cloudy with a temperature of 27.2°C.
```

## Core Tenets

1. **Clean API**: Provide a clean, but powerful, interface for interacting with multiple LLMs.
2. **Unified Input/Output**: Provide unified message formats for both inputs and outputs.
3. **Flexible**: Provide both high-level access via JorlEl and low-level access via underlying providers.
4. **Maintainable**: Prioritize official npm libraries (e.g., `openai`) for each provider.

## Usage

### Basic setup

```typescript
import {JorEl} from "jorel";

const jorel = new JorEl({
  anthropic: {apiKey: "your-anthropic-api-key"},
  grok: {apiKey: "your-grok-api-key"},
  groq: {apiKey: "your-groq-api-key"},
  ollama: {},
  openAI: {apiKey: "your-openai-api-key"},
  vertexAi: {project: "your-project-id", location: "your-location", keyFilename: "path-to-your-service-account-file"},
  systemMessage: "You are a helpful assistant.",
});
```

Instantiating providers during initialization is optional. You can register providers and models later as needed.

```typescript
import {JorEl} from "jorel";

const jorEl = new JorEl();

jorEl.providers.registerOllama({defaultTemperature: 0.2})

jorEl.systemMessage = 'You are a helpful llama.';
```

### Using providers

#### Register Anthropic

Requires Anthropic API key.

```typescript
jorel.providers.registerAnthropic({
  apiKey: "your-anthropic-api-key", // Can also be set as an environment variable ANTHROPIC_API_KEY
  defaultTemperature: 0.7, // optional
});
```

#### Register Grok

Requires Grok API key.

```typescript
jorel.providers.registerGrok({
  apiKey: "your-grok-api-key", // Can also be set as an environment variable GROK_API_KEY
  defaultTemperature: 0.7, // optional
});
```

#### Register Groq

Requires Groq API key.

```typescript
jorel.providers.registerGroq({
  apiKey: "your-groq-api-key", // Can also be set as an environment variable GROQ_API_KEY
  defaultTemperature: 0.7, // optional
});
```

#### Register Ollama

Requires Ollama to be installed and running.

```typescript
jorel.providers.registerOllama({
  defaultTemperature: 0.7, // optional
});
```

#### Register OpenAI

Requires OpenAI API key.

```typescript
jorel.providers.registerOpenAi({
  apiKey: "your-openai-api-key", // Can also be set as an environment variable OPENAI_API_KEY
  defaultTemperature: 0.7, // optional
});
```

#### Register Vertex AI (Google)

Requires Google Vertex AI service account file.

```typescript
jorel.providers.registerGoogleVertexAI({
  project: "your-project-id", // Can also be set as an environment variable GCP_PROJECT
  location: "your-location", // Can also be set as an environment variable CGP_LOCATION
  keyFilename: "path-to-your-service-account-file", // Can also be set as an environment variable GOOGLE_APPLICATION_CREDENTIALS
  defaultTemperature: 0.7, // optional
  safetySettings: [{category: 'safety-category', threshold: "safety-threshold"}], // optional
});
```

#### Register a custom provider

```typescript
import {LlmCoreProvider} from "jorel";

class CustomProvider implements LlmCoreProvider {
  // generateResponse
  // generateResponseStream
  // getAvailableModels
}

const customProviderInstance = new CustomProvider();

jorel.providers.registerCustom("custom", customProviderInstance);
```

#### List registered providers

```typescript
console.log(jorel.providers.list()); // ["openai", "ollama", "custom"]
```

### Using models

#### List registered models

```typescript
console.log(jorel.models.list());
```

#### Register a model

```typescript
jorel.models.register({
  model: "custom-model",
  provider: "custom",
  setAsDefault: true,
});
```

#### Unregister a model

```typescript
jorel.models.unregister("custom-model");
```

#### Set default model

```typescript
jorel.models.setDefault("gpt-4o");
```

### Generate responses

#### Generate a simple response

```typescript
const response = await jorel.ask("What is the capital of France?"); // Will use the default model and system message
console.log(response); // "The capital of France is Paris."
```

#### Generate a simple response with custom model and system message

```typescript
const response = await jorel.ask("What is the capital of France?", {
  model: "gpt-4",
  systemMessage: "Reply in as few words as possible.",
  temperature: 0,
});
console.log(response); // "Paris"
```

#### Generate a response with an image

```typescript
const response = await jorel.ask(["Describe this image", image], {
  systemMessage: "You are an expert in image classification.",
  temperature: 0,
});
console.log(response);
```

#### Generate a response stream

```typescript
for await (const chunk of jorel.stream("Tell me a story about a brave knight.")) {
  process.stdout.write(chunk);
}
```

#### Generate JSON output

```typescript
jorEl.systemMessage = "Format everything you see as a JSON object. Make sure to use snakeCase for attributes!";
const jsonResponse = await jorEl.json("Format this: Name = John, Age = 30, City = Sydney");
console.log(jsonResponse); // Returns { name: "John", age: 30, city: "Sydney" }, and will throw on invalid JSON
```

### JorEl class api and message types

```typescript
class JorEl {
  constructor(config?: InitialConfig);

  // Properties
  systemMessage: string;
  models: {
    list: () => ModelEntry[];
    register: (params: { model: string; provider: string; setAsDefault?: boolean }) => void;
    unregister: (model: string) => void;
    getDefault: () => string;
    setDefault: (model: string) => void;
  };
  providers: {
    list: () => string[];
    registerCustom: (provider: string, coreProvider: LlmCoreProvider) => void;
    registerAnthropic: (config?: AnthropicConfig) => void;
    registerGrok: (config?: OpenAIConfig) => void;
    registerGroq: (config?: GroqConfig) => void;
    registerOllama: (config?: OllamaConfig) => void;
    registerOpenAi: (config?: OpenAIConfig) => void;
    registerGoogleVertexAi: (config?: GoogleVertexAiConfig) => void;
  };

  // Methods
  ask(task: JorElTaskInput, config?: JorElAskGenerationConfig): Promise<string>;

  stream(task: JorElTaskInput, config?: JorElAskGenerationConfig): AsyncGenerator<string>;

  json(task: JorElTaskInput, config?: JorElAskGenerationConfig): Promise<any>;

  generate(messages: LlmMessage[], config?: JorElAskGenerationConfig, json?: boolean): Promise<{
    response: string;
    messages: LlmMessage[];
  }>;

  generateContentStream(messages: LlmMessage[], config?: JorElAskGenerationConfig): AsyncGenerator<

...>;
}

interface LlmGenerationConfig {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

type LlmSystemMessage = {
  role: "system";
  content: string;
}

interface LLmMessageTextContent {
  type: "text";
  text: string;
}

interface LLmMessageImageUrlContent {
  type: "imageUrl";
  mimeType?: string;
  url: string;
}

interface LLmMessageImageDataUrlContent {
  type: "imageData";
  mimeType?: string;
  data: string;
}

type LlmUserMessage = {
  role: "user";
  content: string | (string | LLmMessageTextContent | LLmMessageImageUrlContent | LLmMessageImageDataUrlContent | ImageContent)[];
}

type LlmAssistantMessage = {
  role: "assistant";
  content: string;
}

type LlmMessage = LlmSystemMessage | LlmUserMessage | LlmAssistantMessage;

interface LlmResponseMetaData {
  model: string;
  _provider: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

interface LlmResponse {
  content: string;
  meta: LlmResponseMetaData;
}

interface LlmStreamResponseChunk {
  type: "chunk";
  content: string;
}

interface LlmStreamResponse {
  type: "response";
  content: string;
  meta: LlmResponseMetaData;
}
```

### Alternative usage

#### Directly using providers

You can access providers directly for more control, or if you just want to benefit from the unified message format.

```typescript
import {OpenAIProvider} from "jorel";

const openAiProvider = new OpenAIProvider({apiKey: "your-api-key"});
const response = await openAiProvider.generateResponse("gpt-4", [
  {role: "user", content: "Hello, OpenAI!"},
]);
console.log(response.content);
```

##### Available providers

- AnthropicProvider
- GrokProvider
- GroqProvider
- OllamaProvider
- OpenAIProvider
- GoogleVertexAiProvider

## Examples

There are many more examples in the `examples` directory that demonstrate how to use JorEl with various providers & scenarios (30+ examples and counting).

## Roadmap

- [X] Add support for more providers
    - [X] OpenAi (added in v0.1.0)
    - [X] Ollama (added in v0.2.0)
    - [X] Anthropic (added in v0.3.0)
    - [X] Groq (added in v0.3.0)
    - [X] Google Vertex AI (added in v0.4.0)
    - [X] Grok (added in v0.4.0)
- [X] Implement vision support (images in prompts) (added in v0.5.0)
- [X] Return metadata with responses (added in v0.5.1)
- [X] Add support for tool use (~~experimental,~~ added in v0.6.0)
- [X] Add support for external documents for context/ grounding (added in v0.7.0)
- [ ] Add logger: onLog: 'console' | async function | undefined, logLevel: string
- [ ] Add Middleware: before and after generate calls & tool use, async (logging, pub/sub trigger)
- [ ] Explore agentic capabilities
- [ ] Increase test coverage

## Contributing

Contributions are welcome! Please fork the repository, make your changes, and submit a pull request.

## License

This project is licensed under the MIT License.

