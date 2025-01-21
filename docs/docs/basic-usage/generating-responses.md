---
sidebar_position: 3
---

# Generating responses

JorEl provides several methods for generating responses from LLMs. Let's explore each one.

## Generating text responses

The `ask` method is the simplest way to get responses from an LLM. It returns the response as a string.

### Basic usage

```typescript
const jorEl = new JorEl({
  openAI: true, // Will use OPENAI_API_KEY environment variable
});

const response = await jorEl.ask("What is the capital of France?");
console.log(response);
// Paris is the capital of France.
```

### Customizing responses

You can customize the behavior for each individual request as well:

```typescript
const response = await jorEl.ask("What is the capital of France?", {
  model: "gpt-4",                           // Specify model
  temperature: 0,                           // Control randomness
  systemMessage: "Answer concisely",        // Override system message
});
console.log(response);
// Paris
```

See below for more details on all available configuration options.

### Retrieving metadata

To get additional information about the request and response, you can pass `true` as the third argument to the `ask` method:

```typescript
const {response, meta} = await jorEl.ask(
  "What is the capital of France?",
  { model: "gpt-4" },
  true // Include metadata
);

console.log(meta);
// {
//   model: 'gpt-4',
//   provider: 'openai',
//   durationMs: 730,
//   inputTokens: 26,
//   outputTokens: 16,
// }
```

## Generating JSON responses

The `json` method ensures the response is formatted as a JSON object:

```typescript
// Optional: Set a system message that encourages JSON formatting
jorEl.systemMessage = "Format everything as a JSON object. Use snakeCase for attributes.";

const response = await jorEl.json("Format this: Name = John, Age = 30, City = Sydney");
console.log(response);
// {
//   "first_name": "John",
//   "age": 30,
//   "city": "Sydney"
// }
```

It supports all the same configuration options as `ask` , and you can also get metadata from `json` :

```typescript
const {response, meta} = await jorEl.json(
  "Format this: Name = John, Age = 30",
  { temperature: 0 },
  true // Include metadata
);
```

## Streaming text responses

The `stream` method allows you to receive response chunks as they're generated:

```typescript
const stream = jorEl.stream("Generate a short story about a cat.");

for await (const chunk of stream) {
  process.stdout.write(chunk); // Print each chunk as it arrives
}
```

## Working with images

When using vision-capable models, you can include images in your requests. The easiest way to do this is to use the `ImageContent` class, which allows instantiating an image from a variety of sources like local files, urls, or buffers.

```typescript
import { ImageContent } from 'jorel';

// Load image from file
const image = await ImageContent.fromFile("./image.png");

// Pass image along with the question
const response = await jorEl.ask([
  "What is in this image?",
  image
]);
```

Note: Make sure to use a vision-capable model when working with images. You can set this using:

```typescript
jorEl.models.setDefault("gpt-4-vision-preview"); // For OpenAI
// or
jorEl.models.setDefault("claude-3-sonnet-20240229"); // For Anthropic
```

## Working with documents

You can provide context documents to inform the LLM's responses. While you could also just pass documents into the system or user message, documents provide a more structured way to pass on information.

```typescript
const response = await jorEl.ask("What is the best company for sustainable packaging?", {
  documents: [
    {
      title: "Company Profile",
      content: "PackMojo is a leading provider of custom printed packaging solutions. " +
        "They offer sustainable packaging options including biodegradable materials.",
      source: "https://packmojo.com",
    },
  ]
});
```

You can also customize how documents are presented to the LLM using `documentSystemMessage` :

```typescript
jorEl.documentSystemMessage = "Here are some relevant documents to consider: {{documents}}";
// Or per request:
const response = await jorEl.ask("What is the best company...?", {
  documents: [...],
  documentSystemMessage: "Reference these sources: {{documents}}"
});
```

For more details on working with documents, see the [Documents section](./documents.md).

## Working with tools

Tools allow the LLM to perform actions or retrieve information during the conversation:

```typescript
import { z } from "zod";

const response = await jorEl.ask("What's the weather in Sydney?", {
  tools: [{
    name: "get_weather",
    description: "Get the current weather for a city",
    executor: async ({ city }) => {
      // Simulate weather API call
      return { temperature: 22, conditions: "sunny" };
    },
    params: z.object({
      city: z.string(),
    }),
  }]
});
```

Tools can also be used with streaming responses:

```typescript
const stream = jorEl.stream("What's the weather like in Sydney and Melbourne?", {
  tools: [{
    name: "get_weather",
    description: "Get the current weather for a city",
    executor: async ({ city }) => {
      // Simulate weather API call
      return { temperature: Math.round(20 + Math.random() * 5), conditions: "sunny" };
    },
    params: z.object({
      city: z.string(),
    }),
  }]
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

For more complex tool usage, including chaining tools and handling errors, see the [Tools section](./tools.md).

## Configuration options

When using `ask` , `json` , or `stream` , you can pass a configuration object with the following options:

```typescript
interface GenerationConfig {
  // Model selection
  model?: string;                    // Specific model to use (e.g., "gpt-4", "claude-3-opus")
  
  // Message configuration
  systemMessage?: string;            // Override the default system message
  documentSystemMessage?: string;    // Override how documents are presented
  
  // Generation parameters
  temperature?: number;              // Controls randomness (0-1, default varies by provider)
  
  // Context
  documents?: (LlmDocument | CreateLlmDocument)[] | LlmDocumentCollection;  // Reference documents
  
  // Tool configuration
  tools?: LlmToolKit;               // Tools the LLM can use
  toolChoice?: "none" | "auto" | "required" | string;  // How tools should be used
  maxAttempts?: number;             // Maximum attempts for tool execution
  context?: LLmToolContextSegment;  // Context available to tools (will be pass as second argument to executor, not visible or controllable by the LLM)
  secureContext?: LLmToolContextSegment;  // Secure context for tools (will be pass as third argument to executor, and will not be included in logs)
}
```

Example using multiple configuration options:

```typescript
const response = await jorEl.ask("What's the weather like in Sydney?", {
  model: "gpt-4",
  temperature: 0.7,
  systemMessage: "You are a weather expert. Be precise but conversational.",
  tools: [{
    name: "get_weather",
    description: "Get weather data",
    executor: getWeather,
    params: weatherSchema
  }],
  maxAttempts: 2
});
```

## Advanced methods

### The `generate` method

The `generate` method gives you more control by working directly with message arrays:

```typescript
const response = await jorEl.generate([
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "What is the capital of France?" }
], {
  model: "gpt-4",
  temperature: 0
});

console.log(response.content);    // The response text
console.log(response.meta);       // Metadata about the generation
```

### The `generateContentStream` method

Similar to `stream` , but works with message arrays and provides more detailed chunks:

```typescript
const stream = jorEl.generateContentStream([
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "What is the capital of France?" }
]);

for await (const chunk of stream) {
  if (chunk.type === "chunk") {
    process.stdout.write(chunk.content);
  } else if (chunk.type === "response") {
    console.log("\nMetadata:", chunk.meta);
  }
}
```
