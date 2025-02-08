<p align="center">
  <img src="assets/logo.svg" width="140px" alt="JorEl logo" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/jorel"><img src="https://img.shields.io/npm/v/jorel.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/jorel"><img src="https://img.shields.io/npm/dm/jorel.svg" alt="npm downloads"></a>
  <a href="https://github.com/christianheine/jorel/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/jorel.svg" alt="license"></a>
</p>

# JorEl

JorEl is a powerful TypeScript library that provides a unified interface for working with multiple Large Language Models (LLMs). It simplifies complex LLM interactions like tool calling, image processing, and agent workflows while maintaining full flexibility.

The full documentation is available at [https://christianheine.github.io/jorel/](https://christianheine.github.io/jorel/).

## Key Features

- **Multi-Provider Support**: Seamlessly work with OpenAI, Anthropic, Groq, Google Vertex AI, Ollama, and more
- **Unified Interface**: Single, consistent API across all providers
- **Rich Media Support**: Built-in handling for images and vision models
- **Tool Integration**: First-class support for function calling and external tools
- **Document Grounding**: Easy integration of external documents for context
- **Agent Framework**: Simple but powerful system for complex task processing
- **Type Safety**: Fully written in TypeScript

## Why JorEl?

- 🚀 **Simple to Start**: Get running with a single line of code
- 🔄 **Easy to Switch**: Change providers or models without changing your code
- 🛠 **Powerful When Needed**: Access low-level provider features when required
- 📦 **Production Ready**: Built on official provider SDKs

## Introduction

### Installation

Install JorEl via npm or yarn:

```bash
npm install jorel
```

### Starter Repository

To get started quickly, you can also use the [JorEl Starter](https://github.com/christianheine/jorel-starter) repository. It includes pre-configured TypeScript, ESLint, and Prettier settings, 
along with commonly used utilities like zod and dotenv.

Either clone the repository or use `degit` to create a new project:

```bash
npx degit christianheine/jorel-starter my-jorel-project
cd my-jorel-project
npm install
```

Then just rename the `.env.example` file to `.env` and add your API keys.

To run the example, use:

```bash
npm run start
```

### Quick start

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
### Basic Usage

#### 1. **Simple Response Generation**

This is the most basic usage of JorEl. It will use the default model and provider and return a string.

```typescript
const jorEl = new JorEl({ openAI: true }); // Uses OPENAI_API_KEY env variable
const response = await jorEl.ask("What is the capital of France?");
// Paris
```

#### 2. **JSON Response Generation**

Works similar to the simple response generation, but returns a JSON object.

```typescript
const response = await jorEl.json("Format this as JSON: Name = John, Age = 30");
// { name: "John", age: 30 }
```

#### 3. **Streaming Responses**

Will stream the response as it is generated.

```typescript
const stream = jorEl.stream("Generate a story");
for await (const chunk of stream) {
    process.stdout.write(chunk);
}
```

#### 4. **Image Context**

Allows to pass images to the model.

```typescript
// Load image
const localImage = await ImageContent.fromFile("./image.png");

// Pass image along with the question
const response = await jorEl.ask([
  "Can you describe what is in this image?",
  localImage
]);
// The image shows a cute cat sitting on a chair.
```

#### 5. **Document Context**

Allows to pass documents to the model. This helps with context and grounding.

```typescript
const companyProfile = await LlmDocument.fromFile("company-profile.txt");
const response = await jorEl.ask("What are the products of this company?", {
  documents: [companyProfile]
});
// Response with companyProfile as context
```

#### 6. **Tool Integration**

Allows to pass tools to the model. Tools are functions that the model can call to get information (or perform actions).

```typescript
import { z } from "zod";

const response = await jorEl.ask("What's the weather in Sydney?", {
  tools: [{
    name: "get_weather",
    description: "Get the current temperature and conditions for a city",
    executor: getWeather, // function that returns a promise
    params: z.object({ city: z.string() })
  }]
});
```

#### 7. **Responses with metadata**

Works with both `ask` and `json` and returns the response, metadata and messages, e.g. to store them in a database.

```typescript
const { response, meta, messages } = await jorEl.ask(
  "What are the capitals of France and Germany?",
  {
    systemMessage: "Answer as succinctly as possible",
  },
  true // Request metadata
);

console.log(response);
// "Paris and Berlin"

console.log(meta);
// {
//   model: 'gpt-4o-mini',
//   provider: 'openai',
//   temperature: 0,
//   durationMs: 757,
//   inputTokens: 26,
//   outputTokens: 16
// }

console.log(messages);
// Array of system and user messages with timestamps
```

### Advanced Features

#### 1. **Agents**

JorEl provides a powerful agent system for complex task processing:

```typescript
// Create a JorEl instance
const jorel = new JorEl({ openAI: { apiKey: "your-openai-api-key" } });

// Register tools that agents can use
jorel.team.addTools([{
  name: "get_weather",
  description: "Get weather information",
  executor: async ({ city }) => ({ temperature: 22, conditions: "sunny" }),
  params: z.object({ city: z.string() })
}]);

// Create a weather agent
const weatherAgent = jorel.team.addAgent({
  name: "weather_agent",
  description: "Weather information specialist",
  systemMessageTemplate: "You are a weather specialist. Return JSON responses.",
  allowedTools: ["get_weather"],
  responseType: "json"
});

// Create and execute a task
const task = await jorel.team.createTask("What's the weather in Sydney?");
const taskExecution = await jorel.team.executeTask(task, {
  limits: {
    maxIterations: 10,
    maxGenerations: 6
  }
});

console.log(taskExecution.result);
// {
//   "city": "Sydney",
//   "temperature": 22,
//   "conditions": "sunny"
// }
```

Agents can also delegate tasks to other specialized agents:

```typescript
// Create a main agent that can delegate
const mainAgent = jorel.team.addAgent({
  name: "main_agent",
  description: "Main assistant that coordinates with specialists",
});

// Add a weather specialist that the main agent can delegate to
mainAgent.addDelegate({
  name: "weather_agent",
  description: "Weather information specialist",
  systemMessageTemplate: "You are a weather specialist.",
  allowedTools: ["get_weather"]
});
```

### Provider Support

JorEl supports multiple LLM providers out of the box:
- OpenAI
- Anthropic
- Groq
- Grok
- Google Vertex AI
- Ollama
- Mistral

Each provider can be configured during initialization or registered later:

```typescript
// During initialization
const jorEl = new JorEl({
  openAI: { apiKey: "..." },
  anthropic: { apiKey: "..." }
});

// Or after initialization
jorEl.providers.registerGroq({ apiKey: "..." });
```

For complete documentation, visit our [documentation site](https://christianheine.github.io/jorel/).
