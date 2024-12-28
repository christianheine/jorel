# JorEl

JorEl is a lightweight, elegant wrapper for interacting with multiple large language models (LLMs) such as OpenAI, Anthropic, Groq, Google, Ollama, and more. Designed with simplicity and usability in
mind,
it provides a unified message format for interacting with different models while remaining lightweight compared to solutions like LangChain.

## Features

- **Unified Message Format**: Standardizes user, system, and assistant messages across LLMs.
- **Lightweight**: Minimal overhead with a focus on using official libraries wherever possible.
- **Flexible Usage**: Use either as a unified wrapper for various providers or directly within programs for streamlined access.
- **Clean API**: An elegant interface for managing providers, models, and generating responses.

## Installation

Install JorEl via npm:

```bash
npm install jorel
```

## Quick start

```typescript
import {JorEl} from "jorel";

const jorel = new JorEl({openAI: {apiKey: "your-openai-api-key"}});

const response = await jorel.ask("What is the capital of Australia?");

console.log(response); // "Sydney"
```

## Core Tenets

1. **Lightweight**: Avoid unnecessary complexity; focus on wrapping LLM APIs efficiently.
2. **Unified Input/Output**: Provide unified message formats for both inputs and outputs.
3. **Official Libraries First**: Prioritize official npm libraries (e.g., `openai`) for each provider.
4. **Clean API**: Ensure intuitive and maintainable interfaces for developers.

## Usage

### Basic Setup

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

### Using Providers

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

#### Register a Custom Provider

```
typescript
import {Ll;mCoreProvider} from "./llm-core-provider";

class CustomProvider implements LlmCoreProvider {
  // generateResponse
  // generateResponseStream
  // getAvailableModels
}

const customProviderInstance = new CustomProvider();

jorel.providers.registerCustom("custom", customProviderInstance);
```

#### List Registered Providers

```typescript
console.log(jorel.providers.list()); // ["openai", "ollama", "custom"]
```

### Using Models

#### List Registered Models

```typescript
console.log(jorel.models.list());
```

#### Register a Model

```typescript
jorel.models.register({
  model: "custom-model",
  provider: "custom",
  setAsDefault: true,
});
```

#### Unregister a Model

```typescript
jorel.models.unregister("custom-model");
```

#### Set Default Model

```typescript
jorel.models.setDefault("gpt-4o");
```

### Generate Responses

#### Generate a Simple Response

```typescript
const response = await jorel.ask("What is the capital of France?"); // Will use the default model and system message
console.log(response); // "The capital of France is Paris."
```

#### Generate a Simple Response with custom model and system message

```typescript
const response = await jorel.ask("What is the capital of France?", {
  model: "gpt-4",
  systemMessage: "Reply in as few words as possible.",
  temperature: 0,
}); // Will use the default model and system message
console.log(response); // "Paris"
```

#### Generate a Response Stream

```typescript
for await (const chunk of jorel.stream("Tell me a story about a brave knight.")) {
  process.stdout.write(chunk);
}
```

#### Generate JSON Output

```typescript
jorEl.systemMessage = "Format everything you see as a JSON object. Make sure to use snakeCase for attributes!";
const jsonResponse = await jorEl.json("Format this: Name = John, Age = 30, City = Sydney");
console.log(jsonResponse); // Returns { name: "John", age: 30, city: "Sydney" }, and will throw on invalid JSON
```

### Advanced Usage

#### Directly Use Providers

You can access providers directly for more control, or if you just want to benefit from the unified message format.

```typescript
import {OpenAIProvider} from "jorel/providers";

const openAiProvider = new OpenAIProvider({apiKey: "your-api-key"});
const response = await openAiProvider.generateResponse("gpt-4", [
  {role: "user", content: "Hello, OpenAI!"},
]);
console.log(response.content);
```

## Roadmap

- [X] Add support for more providers
    - [X] OpenAi (added in v0.1.0)
    - [X] Ollama (added in v0.2.0)
    - [X] Anthropic (added in v0.3.0)
    - [X] Groq (added in v0.3.0)
    - [X] Google Vertex AI (added in v0.4.0)
    - [X] Grok (added in v0.4.0)
- [ ] Implement vision support (images in prompts)
- [ ] Add support for tool use
- [ ] Return metadata with responses
- [ ] Increase test coverage

## Contributing

Contributions are welcome! Please fork the repository, make your changes, and submit a pull request.

## License

This project is licensed under the MIT License.

