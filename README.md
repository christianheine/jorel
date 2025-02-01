<p align="center">
  <img src="assets/logo.svg" width="140px" alt="JorEl logo" />
</p>

# JorEl

JorEl is a lightweight, unified wrapper for interacting with multiple large language models (LLMs) such as OpenAI, Anthropic, Groq, Google, Ollama, and more.

It offers two main interfaces: a high-level interface for generating responses with a single line of code, and a low-level interface for more control over the generation process.

Apart from the unified interface, JorEl also significantly simplifies working with both images and external tools.

Finally, JorEl supports complex task processing via agents, in a very straightforward manner.

## Documentation

The documentation is available at [https://christianheine.github.io/jorel](https://christianheine.github.io/jorel).

## Features

- Straightforward api to a range of leading language models (LLMs): OpenAI, Anthropic, Groq, Vertex AI, Ollama, Grok.
- Unified message format for interacting with different models.
- Full support for vision (images in prompts), with automatic handling of image data.
- Full support for external tools, enabling the model to invoke external tools during interactions.
- Easily provide external documents for context/ grounding.
- Create text embeddings.
- Create agentic tasks, including transfer of control and multi-level delegation.
- Access to unified providers directly for more control.

## Core Tenets

1. **Clean API**: Provide a clean, but powerful, interface for interacting with multiple LLMs.
2. **Unified Input/Output**: Provide unified message formats for both inputs and outputs.
3. **Flexible**: Provide both high-level access via JorlEl and low-level access via underlying providers.
4. **Maintainable**: Prioritize official npm libraries (e.g., `openai`) for each provider.

## Installation

Install JorEl via npm:

```bash
npm install jorel
```

## Quick start

```typescript
import { JorEl } from "jorel";

// Create a new JorEl instance with the providers you want to use
const jorel = new JorEl({ openAI: { apiKey: "your-openai-api-key" } });

// Optionally, set a default model
jorel.models.setDefault("gpt-4o-mini");

// Generate a response for a text prompt, using the default model
const response = await jorel.ask("What is the capital of Australia, in one word?");

console.log(response); // "Sydney"
```

```typescript
import { JorEl } from "jorel";

// You can also just pass a boolean to specify the providers you want to use
const jorEl = new JorEl({ openAI: true }); // Uses process.env.OPENAI_API_KEY

// Generate a response using a specific model, system message, and temperature
const response = await jorEl.ask("What is the capital of France?", {
  model: "gpt-4o-mini",
  systemMessage: "You are a helpful assistant",
  temperature: 0.5,
});

console.log(response); // "The capital of France is Paris."
```

### Prompts with images

```typescript
import { JorEl, ImageContent } from "jorel";

const jorel = new JorEl({ openAI: true }); // Uses process.env.OPENAI_API_KEY

// Load an image (from a file, buffer, url, data url, or base64 string)
const image = ImageContent.fromFile("path-to-your-image.jpg");

// Generate a response for a vision prompt
const response = await jorel.ask(["Describe this image", image]);

console.log(response); // "description of the image"
```

### Providing documents for context/ grounding

```typescript
import { JorEl } from "jorel";

const jorEl = new JorEl({ openAI: true }); // Uses process.env.OPENAI_API_KEY

// Will consider the documents provided
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
- `params`: A JSON schema or Zod object defining the parameters the tool accepts.

Example:

```typescript
const jorEl = new JorEl({
  openAI: { apiKey: process.env.OPENAI_API_KEY },
});

const tools = new LlmToolKit([
  {
    name: "get_stock_data",
    description: "Get stock data for a given ticker symbol (previous day)",
    executor: getStockValue, // Requires Polygon.io API key
    params: {
      type: "object",
      properties: {
        tickerSymbol: { type: "string" },
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
        city: { type: "string" },
      },
      required: ["city"],
    }
  }]);

const response = await jorEl.ask("What is the current stock price for Amazon, and the weather in Sydney?", { tools });

console.log(response);
// The current stock price for Amazon (AMZN) is $224.19.
// In Sydney, the weather is partly cloudy with a temperature of 27.2°C.
```

### Simple Agent

```typescript
const jorEl = new JorEl({ openAI: true, logger: "console", logLevel: "debug" });

jorEl.team.addTools([
  {
    name: "get_weather",
    description: "Get the current temperature and conditions for a city",
    executor: getWeather,
    params: z.object({ city: z.string() }),
  },
]);

jorEl.team.addAgent({
  name: "weather_agent",
  description: "Can provide weather information for a given location.",
  systemMessageTemplate:
    "You are a helpful assistant. You can provide weather information for a given location. Return JSON (user, city, temperature, conditions, time). Here is some additional context: {{documents}}",
  allowedTools: ["get_weather"],
  documents: [
    { content: "The current location is Sydney", title: "Location Info" },
    { content: "The name of the user is Christian", title: "User Profile" },
    { content: `The current time is ${new Date().toLocaleTimeString()}`, title: "Time Info" },
  ],
  responseType: "json",
  // model: "gpt4o-mini", // Optional, if no model is provided, the default model of JorEl is used
});

const task = await jorEl.team.createTask("Hi. What is the current time and weather?");

const executedTask = await jorEl.team.executeTask(task, {
  limits: {
    maxIterations: 10, // Prevents infinite loops
    maxGenerations: 6, // Maximum number of LLM generations (e.g. to control cost)
    maxDelegations: 2,
  },
});

const { events, stats, tokens } = executedTask.eventsWithStatistics;

console.log("\nEvents:");
for (const event of events) {
  console.log(`- ${event.eventType}: ${event.action}`);
}

console.log("\nStatistics:");
console.log({ stats, tokens });

console.log("\nResult:");
console.log(executedTask.result);
```

### Agent with Delegation

```typescript
 const jorEl = new JorEl({ openAI: true, logger: "console", logLevel: "debug" });

jorEl.team.addTools([
  {
    name: "get_weather",
    description: "Get the current temperature and conditions for a city",
    executor: getWeather,
    params: z.object({ city: z.string() }),
  },
]);

const mainAgent = jorEl.team.addAgent({
  name: "main_agent",
  description: "Main agent who communicates between user and other agents.",
  systemMessageTemplate:
    "You are a helpful assistant. You try to answer the user's questions to the best of your ability. If you can't, you'll ask another agent for help. These agents are available to you: {{delegates}}",
});

mainAgent.addDelegate({
  name: "weather_agent",
  description: "Can provide weather information for a given location.",
  systemMessageTemplate: "You are a weather agent. You can provide weather information for a given location.",
  allowedTools: ["get_weather"],
});

const task = await jorEl.team.createTask("What is the weather in Sydney?", {});

const executedTask = await jorEl.team.executeTask(task, {
  limits: {
    maxIterations: 10,
    maxGenerations: 6,
    maxDelegations: 2,
  },
});

const { events, stats, tokens } = executedTask.eventsWithStatistics;

console.log("\nEvents:");

for (const event of events) {
  console.log(`- ${event.eventType}: ${event.action}`);
}

console.log("\nStatistics:");
console.log({ stats, tokens });

console.log("\nResult:");
console.log(executedTask.result);
```

## Usage

### Basic setup

```typescript
import { JorEl } from "jorel";

const jorel = new JorEl({
  anthropic: { apiKey: "your-anthropic-api-key" },
  grok: { apiKey: "your-grok-api-key" },
  groq: { apiKey: "your-groq-api-key" },
  ollama: {},
  openAI: { apiKey: "your-openai-api-key" },
  vertexAi: { project: "your-project-id", location: "your-location", keyFilename: "path-to-your-service-account-file" },
  systemMessage: "You are a helpful assistant.",
});
```

Instantiating providers during initialization is optional. You can register providers and models later as needed.

```typescript
import { JorEl } from "jorel";

const jorEl = new JorEl();

jorEl.providers.registerOllama({ defaultTemperature: 0.2 })

jorEl.systemMessage = 'You are a helpful llama.';
```

#### Register a custom provider

```typescript
import { LlmCoreProvider } from "jorel";

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
- [X] Add support for passing tool definitions as zod objects (added in v0.7.1)
- [X] Add support for embeddings (added in v0.7.2)
- [X] Add logging (added in v0.8.0)
- [X] Add support for streaming with tool use (added in v0.8.0)
- [X] Add support for tasks via agents, including transfer and delegation (added in v0.8.0)
- [ ] Set up dedicated documentation site (in progress)
- [ ] Add Middleware: before and after generate calls & potentially tool use
- [ ] Increase test coverage

## Contributing

Contributions are welcome! Please fork the repository, make your changes, and submit a pull request.

## License

This project is licensed under the MIT License.