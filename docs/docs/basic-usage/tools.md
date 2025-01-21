---
sidebar_position: 5
---

# Using Tools

Tools allow LLMs to perform actions or retrieve information during conversations. JorEl provides a flexible system for defining and using tools.

## Quick Start

Here's a basic example of using a tool with JorEl:

```typescript
import { JorEl } from 'jorel';
import { z } from 'zod';

const jorEl = new JorEl({
  openAI: true, // Will use OPENAI_API_KEY environment variable
});

// Define and use a tool
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

console.log(response);
// The current weather in Sydney is 22°C and it's sunny.
```

## Defining Tools

A tool consists of several key components:

```typescript
interface LlmToolConfiguration {
  name: string;                    // Unique identifier for the tool
  description: string;             // Description of what the tool does
  executor?: LlmToolExecutor;      // Function that executes the tool
  params?: ZodObject | JsonSchema; // Parameters the tool accepts
  requiresConfirmation?: boolean;  // Whether tool calls need approval
}
```

### Using Zod for Parameters (Recommended)

The recommended way to define tool parameters is using Zod schemas. This provides type safety and automatic JSON Schema generation:

```typescript
import { z } from 'zod';

const weatherTool = {
  name: "get_weather",
  description: "Get weather information for a location",
  executor: getWeather,
  params: z.object({
    city: z.string(),
    units: z.enum(["celsius", "fahrenheit"]).optional(),
  }),
};
```

### Using JSON Schema

You can also define parameters using raw JSON Schema:

```typescript
const weatherTool = {
  name: "get_weather",
  description: "Get weather information for a location",
  executor: getWeather,
  params: {
    type: "object",
    properties: {
      city: { type: "string" },
      units: { type: "string", enum: ["celsius", "fahrenheit"] },
    },
    required: ["city"],
  },
};
```

## Tool Execution

The executor function receives the parsed arguments and optional context:

```typescript
type LlmToolExecutor = (
  args: object,                           // Parsed arguments
  context?: Record<string, any>,         // Optional context (visible in logs)
  secureContext?: Record<string, any>    // Secure context (not logged)
) => Promise<object>;

const weatherTool = {
  name: "get_weather",
  executor: async (args, context, secureContext) => {
    const { city } = args;
    const apiKey = secureContext?.apiKey;
    // Make API call...
    return { temperature, conditions };
  },
};
```

## Using Tools in Requests

### Basic Usage

```typescript
const response = await jorEl.ask("What's the weather like?", {
  tools: [weatherTool],
  context: { defaultCity: "Sydney" },     // Available to tools
  secureContext: { apiKey: "secret" },    // Available but not logged
});
```

### Controlling Tool Usage

You can control how tools are used with `toolChoice` :

```typescript
const response = await jorEl.ask("What's the weather?", {
  tools: [weatherTool],
  toolChoice: "auto",      // Let the LLM decide (default)
  // toolChoice: "none",   // Disable tools
  // toolChoice: "required" // Force tool usage
});
```

### Multiple Tools

```typescript
const response = await jorEl.ask("What's the weather and stock price?", {
  tools: [{
    name: "get_weather",
    description: "Get weather data",
    executor: getWeather,
    params: weatherSchema,
  }, {
    name: "get_stock_price",
    description: "Get current stock price",
    executor: getStockPrice,
    params: stockSchema,
  }],
});
```

## Tool Approval

You can require approval before tools are executed:

```typescript
const response = await jorEl.ask("Transfer $100 to Bob", {
  tools: [{
    name: "transfer_money",
    description: "Transfer money between accounts",
    executor: transferMoney,
    params: transferSchema,
    requiresConfirmation: true,  // Requires approval
  }],
});
```

Note that this is only supported with using agents. See the [Agents section](../agents/intro.md) for more information.

## Streaming with Tools

Tools work seamlessly with streaming responses:

```typescript
const stream = jorEl.stream("What's the weather in Sydney and Melbourne?", {
  tools: [{
    name: "get_weather",
    description: "Get weather data",
    executor: getWeather,
    params: weatherSchema,
  }],
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

## Advanced Usage

### Tool Context

You can pass context to tools that isn't visible to the LLM:

```typescript
const response = await jorEl.ask("What's the weather?", {
  tools: [weatherTool],
  context: {
    userId: "123",
    preferences: { units: "celsius" },
  },
  secureContext: {
    apiKey: process.env.WEATHER_API_KEY,
  },
});
```

### Error Handling

Tools can throw errors which are handled gracefully:

```typescript
const weatherTool = {
  name: "get_weather",
  executor: async ({ city }) => {
    if (!isValidCity(city)) {
      throw new Error(`Invalid city: ${city}`);
    }
    return await getWeather(city);
  },
};
```

### Retry Configuration

You can control how many times a tool can be attempted:

```typescript
const response = await jorEl.ask("What's the weather?", {
  tools: [weatherTool],
  maxAttempts: 3,  // Maximum attempts per tool call
});
```

## Working with Agents

Tools are particularly powerful when used with JorEl's agent system. See the [Agents section](../agents/intro.md) for more details on how to use tools with agents.
