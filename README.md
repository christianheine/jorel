<p align="center">
  <img src="assets/logo.svg" width="140px" alt="JorEl logo" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/jorel"><img src="https://img.shields.io/npm/v/jorel.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/jorel"><img src="https://img.shields.io/npm/dm/jorel.svg" alt="npm downloads"></a>
  <a href="https://github.com/christianheine/jorel/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/jorel.svg" alt="license"></a>
</p>

# JorEl

JorEl provides a unified interface for working with multiple Large Language Models (LLMs). It simplifies complex LLM interactions like tool calling, image processing, and agent workflows while maintaining full flexibility.

The full documentation is available at [https://christianheine.github.io/jorel/](https://christianheine.github.io/jorel/).

## Key Features

* **Multi-Provider Support**: Seamlessly work with OpenAI, Anthropic, Groq, Google Vertex AI, Ollama, OpenRouter, and more
* **Unified Interface**: Single, consistent API across all providers
* **Rich Media Support**: Built-in handling for images and vision models
* **Advanced Tool Integration**: First-class support for function calling with approval workflows and tool management utilities
* **Document Grounding**: Easy integration of external documents for context
* **Agent Framework**: Simple but powerful system for complex task processing
* **Stream Control**: Configurable buffering for optimal streaming performance
* **Type Safety**: Fully written in TypeScript

## Why JorEl?

* 🚀 **Simple to Start**: Get running with a single line of code
* 🔄 **Easy to Switch**: Change providers or models without changing your code
* 🛠 **Powerful When Needed**: Access low-level provider features when required
* 📦 **Production Ready**: Built on official provider SDKs

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

## What's New in v1.2.0

* **🤖 Gemini 3 Pro Support**: Full support for Gemini 3 Pro, including `thought_signature` handling for reliable tool use
* **🧠 Google GenAI Thinking**: Access reasoning traces from Google's thinking models
* **🛠️ Improved Stability**: Fixes for mixed content handling in Google GenAI responses

## What's New in v1.1.0

* **🧠 Reasoning Content Support**: Access reasoning/thinking processes from supported models (Anthropic, Mistral, Ollama, Groq, OpenRouter)
* **📊 Stream Message Tracking**: Track message boundaries and IDs in real-time with `messageStart`,  `messageEnd` events
* **🔌 Native OpenRouter SDK**: Optional native `@openrouter/sdk` integration with full streaming and reasoning support
* **🔒 JSON Parsing Modes**: Strict/loose parsing options for better error handling

See the [full changelog](CHANGELOG.md) for complete details.

### Quick start

```typescript
import { JorEl } from "jorel";

// Create a new JorEl instance with the providers you want to use
const jorel = new JorEl({ openAI: { apiKey: "your-openai-api-key" } });

// Optionally, set a default model
jorel.models.setDefault("gpt-4o-mini");

// Generate a response for a text prompt, using the default model
const response = await jorel.text("What is the capital of Australia, in one word?");

console.log(response); // "Sydney"
```

### Basic Usage

#### 1. **Simple Response Generation**

This is the most basic usage of JorEl. It will use the default model and provider and return a string.

```typescript
const jorEl = new JorEl({ openAI: true }); // Uses OPENAI_API_KEY env variable
const response = await jorEl.text("What is the capital of France?");
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

#### 3a. **Streaming with Message Tracking**

The `streamWithMeta` method provides enhanced streaming with message tracking, metadata, and support for automatic tool processing:

```typescript
const stream = jorEl.streamWithMeta("What's the weather in Sydney?", {
  tools: [weatherTool] // Tools are automatically processed
});

for await (const event of stream) {
  switch (event.type) {
    case "messageStart":
      // A new message generation has started
      console.log(`Starting message ${event.messageId}`);
      break;
      
    case "reasoningChunk":
      // Reasoning/thinking chunk (if supported by model)
      console.log(`Thinking: ${event.content}`);
      console.log(`Message ID: ${event.messageId}`);
      break;

    case "toolCallStarted":
      // Tool call initiated
      console.log(`Calling tool: ${event.toolCall.request.function.name}`);
      break;
      
    case "toolCallCompleted":
      // Tool call finished
      console.log(`Tool result: ${JSON.stringify(event.toolCall.result)}`);
      break;
    
    case "chunk":
      // Regular content chunk with message ID
      process.stdout.write(event.content);
      console.log(`Message ID: ${event.messageId}`);
      break;
      
    case "messageEnd":
      // Message generation completed
      console.log(`\nCompleted message ${event.messageId}`);
      console.log(event.message); // Full message object
      break;
      
    case "response":
      // Final response with metadata
      console.log(`Model: ${event.meta.model}`);
      console.log(`Tokens: ${event.meta.inputTokens}/${event.meta.outputTokens}`);
      break;
      
    case "messages":
      // Complete conversation history
      console.log(`Total messages: ${event.messages.length}`);
      console.log(`Stop reason: ${event.stopReason}`);
      break;
  }
}
```

Each content and reasoning chunk includes a `messageId` that corresponds to the message being generated, allowing you to track which chunks belong to which message in real-time. This is especially useful when handling multiple tool calls, as each iteration produces a new message with a unique ID.

#### 3b. **Stream Buffering**

Control the rate of chunk emission to help with backpressure in downstream systems:

```typescript
// Buffer chunks for 200ms before emitting
const stream = jorEl.stream("Generate a long story", {
  streamBuffer: { bufferTimeMs: 200 }
});

for await (const chunk of stream) {
    process.stdout.write(chunk); // Fewer, larger chunks
}

// Or disable buffering entirely
const unbufferedStream = jorEl.stream("Generate a story", {
  streamBuffer: { disabled: true }
});
```

#### 4. **Image Context**

Allows to pass images to the model.

```typescript
// Load image
const localImage = await ImageContent.fromFile("./image.png");

// Pass image along with the question
const response = await jorEl.text([
  "Can you describe what is in this image?",
  localImage
]);
// The image shows a cute cat sitting on a chair.
```

#### 5. **Document Context**

Allows to pass documents to the model. This helps with context and grounding.

```typescript
const companyProfile = await LlmDocument.fromFile("company-profile.txt");
const response = await jorEl.text("What are the products of this company?", {
  documents: [companyProfile]
});
// Response with companyProfile as context
```

#### 6. **Tool Integration**

Allows to pass tools to the model. Tools are functions that the model can call to get information (or perform actions).

```typescript
import { z } from "zod";

const response = await jorEl.text("What's the weather in Sydney?", {
  tools: [{
    name: "get_weather",
    description: "Get the current temperature and conditions for a city",
    executor: getWeather, // function that returns a promise
    params: z.object({ city: z.string() })
  }]
});
```

#### 6a. **Tool Approvals & Advanced Tool Handling**

JorEl now provides advanced tool handling capabilities including approval workflows and utilities for managing tool calls:

```typescript
import { LlmToolKit } from "jorel";

// Create tools with approval requirements
const toolkit = new LlmToolKit([
  {
    name: "read_file",
    description: "Read contents of a file",
    requiresConfirmation: false, // Safe operation
    executor: async (args) => ({ content: "file contents..." }),
    params: {
      type: "object",
      properties: { filename: { type: "string" } },
      required: ["filename"]
    }
  },
  {
    name: "delete_file", 
    description: "Delete a file permanently",
    requiresConfirmation: true, // Requires approval
    executor: async (args) => ({ success: true }),
    params: {
      type: "object", 
      properties: { filename: { type: "string" } },
      required: ["filename"]
    }
  }
]);

// Initial generation with tools requiring approval
const initialResult = await jorEl.text(
  "Please read config.txt and delete temp.log", 
  { tools: toolkit }, 
  true // Include metadata
);

// Handle approval workflow if needed
if (initialResult.stopReason === "toolCallsRequireApproval") {
  const messageRequiringApproval = toolkit.utilities.messages
    .getLatestMessageWithApprovalRequired(initialResult.messages);
  
  const toolCallsRequiringApproval = toolkit.utilities.message
    .extractToolCallsRequiringApproval(messageRequiringApproval);
  
  let updatedMessages = initialResult.messages;
  
  for (const toolCall of toolCallsRequiringApproval) {
    const { name } = toolCall.request.function;
    
    if (name === "delete_file") {
      // Reject dangerous operations
      updatedMessages = toolkit.utilities.messages.rejectToolCalls(
        updatedMessages, { toolCallIds: toolCall.id }
      );
    } else {
      // Approve safe operations
      updatedMessages = toolkit.utilities.messages.approveToolCalls(
        updatedMessages, { toolCallIds: toolCall.id }
      );
    }
  }
  
  // Process approved tool calls and generate final response
  if (toolkit.utilities.messages.getNumberOfPendingToolCalls(updatedMessages) > 0) {
    updatedMessages = await jorEl.processToolCalls(updatedMessages, { tools: toolkit });
  }
  
  const finalResult = await jorEl.text(updatedMessages, { tools: toolkit }, true);
  console.log(finalResult.response);
}
```

#### 7. **Responses with metadata**

Works with both `text` and `json` and returns the response, metadata and messages, e.g. to store them in a database.

```typescript
const { response, meta, messages } = await jorEl.text(
  "What is the capital or France?",
  {
    systemMessage: "Answer as succinctly as possible",
  },
  true // Request metadata
);

console.log(response);
// "Paris"

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

#### 8. Follow-up generation

You can add the message history to a follow-up generation to use the previous messages for context.

```typescript

const { response, messages } = await jorEl.text(
  "What is the capital of France",
  {
    systemMessage: "Answer as few words as possible",
  },
  true,
);

console.log(response);
// Paris

const followUpResponse = await jorEl.text('And Germany?', {
  messageHistory: messages,
  systemMessage: "Answer with additional details",
})

console.log(followUpResponse);
// The capital of Germany is Berlin. Berlin is not only the largest city in Germany
// but also a significant cultural, political, and historical center in Europe.
// It is known for its rich history, vibrant arts scene, and landmarks such as the
// Brandenburg Gate, the Berlin Wall, and Museum Island.
```

#### 9. **Using OpenRouter**

JorEl supports OpenRouter, which gives you access to various models from different providers through a single API:

```typescript
// Initialize with OpenRouter (default: uses OpenAI SDK compatibility)
const jorEl = new JorEl({
  openRouter: true, // Uses OPEN_ROUTER_API_KEY environment variable
});

// Or use the native OpenRouter SDK for full feature support (recommended)
const jorElNative = new JorEl({
  openRouter: { 
    useNativeSDK: true, // Enable native SDK
    apiKey: "your-api-key" 
  }
});

// Register a model from Anthropic via OpenRouter
jorEl.providers.openRouter.addModel("anthropic/claude-3-7-sonnet");

// Use the model
const response = await jorEl.text("What is the capital of France?", {
  model: "anthropic/claude-3-7-sonnet",
});
// Paris
```

The native SDK provides additional features like reasoning content support and improved streaming performance.

#### 10. **Reasoning Content**

Access the model's internal reasoning process (supported by Anthropic, Mistral, Ollama, Groq, and OpenRouter via native SDK):

```typescript
const { response, meta, messages } = await jorEl.text(
  "Solve this math problem: If a train travels 120 miles in 2 hours, what is its speed?",
  {
    reasoningEffort: "high" // Available: minimal, low, medium, high
  },
  true // Include metadata
);

console.log(response);
// "The train's speed is 60 miles per hour."

// Access the reasoning process from the last assistant message
const lastMessage = messages[messages.length - 1];
if (lastMessage.role === "assistant" && lastMessage.reasoningContent) {
  console.log(lastMessage.reasoningContent);
  // "Let me think through this step by step:
  //  1. Speed = Distance / Time
  //  2. Distance = 120 miles
  //  3. Time = 2 hours
  //  4. Speed = 120 / 2 = 60 mph"
}

// Check reasoning token usage
console.log(meta.reasoningTokens);
// 45
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
* OpenAI
* Anthropic
* Google Vertex AI
* Google Generative AI
* Groq
* Grok
* Mistral
* Ollama
* OpenRouter

Each provider can be configured during initialization or registered later:

```typescript
// During initialization
const jorEl = new JorEl({
  openAI: { apiKey: "..." },
  anthropic: { apiKey: "..." },
  openRouter: { apiKey: "..." }
});

// Or after initialization
jorEl.providers.registerGroq({ apiKey: "..." });
```

Some providers expose additional parameters, e.g. around retries and timeouts.

For complete documentation, visit our [documentation site](https://christianheine.github.io/jorel/).
