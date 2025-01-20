---
sidebar_position: 1
---

# Quick Start

Get started with JorEl, a unified interface for multiple LLM providers including OpenAI, Anthropic, Groq, Grok, Google Vertex AI, and Ollama.

## Installation

Install JorEl using npm:

```bash
npm install jorel
```

Or using yarn:

```bash
yarn add jorel
```

## Getting started

### Initialize JorEl

Create a new JorEl instance with your preferred provider(s). Here's an example using OpenAI:

```typescript
import {JorEl} from 'jorel';

const jorEl = new JorEl({
  openAI: {apiKey: process.env.OPENAI_API_KEY},
});
```

You can initialize multiple providers at once:

```typescript
const jorEl = new JorEl({
  openAI: {apiKey: process.env.OPENAI_API_KEY},
  anthropic: {apiKey: process.env.ANTHROPIC_API_KEY},
  groq: {apiKey: process.env.GROQ_API_KEY},
});
```

Alternatively, you can just pass a boolean per provider and JorEl will use respective environment variables:

```typescript

const jorEl = new JorEl({
  openAI: true,     // Will use OPENAI_API_KEY environment variable
  anthropic: true,  // Will use ANTHROPIC_API_KEY environment variable
  groq: true,       // Will use GROQ_API_KEY environment variable
  grok: true,       // Will use GROK_API_KEY environment variable
  vertexAI: true,   // Will use GCP_PROJECT, GCP_LOCATION, GOOGLE_APPLICATION_CREDENTIALS environment variables
  ollama: true,     // No environment variables needed
});
```

### Generating text

The `ask` method is the simplest way to get responses from the LLM:

#### Basic usage

When using the ask method without any additional configuration, JorEl will use the default model and provider, and return the response as a string.

```typescript
const response = await jorEl.ask("What is the capital of France?");
console.log(response);
// Paris is the capital of France.
```

#### Use with configuration

When using the ask method with configuration, you can specify the model, temperature, system message, and other parameters. It will still return the response as a string.

```typescript
const response = await jorEl.ask("What is the capital of France?", {
  model: "gpt-4",
  temperature: 0,
  systemMessage: "Answer concisely",
});
console.log(response);
// Paris
```

#### Use with metadata

When using the ask method with metadata, you can get additional information about the request and response.

```typescript
const {response, meta} = await jorEl.ask("What is the capital of France?", {
    model: "gpt-4",
    systemMessage: "Answer concisely",
  },
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

### Generating JSON

The `json` method is similar to `ask` but ensures the response is formatted as a JSON object:

```typescript
// Set a system message that encourages JSON formatting
jorEl.systemMessage = "Format everything as a JSON object. Use snakeCase for attributes.";

const response = await jorEl.json("Format this: Name = John, Age = 30, City = Sydney");
console.log(response);
// {
//   "first_name": "John",
//   "age": 30,
//   "city": "Sydney"
// }
```

### Working with Documents

You can provide context documents to inform the LLM's response:

```typescript
const response = await jorEl.ask("What is the best company for sustainable custom packaging?", {
  documents: [
    {
      title: "Company Profile",
      content: "PackMojo is a leading provider of custom printed packaging solutions. " +
        "They offer a wide range of sustainable packaging options, " +
        "including biodegradable materials and recycled content, and soy-based inks.",
      source: "https://packmojo.com",
    },
  ],
});

console.log(response);
// [PackMojo](https://packmojo.com) is an excellent choice for sustainable custom packaging.
```

### Using Tools

JorEl makes it very easy to pass tools to the LLM, including schema setup via zod (though you can of course also pass a plain JSON schema).

For many basic agentic use-case, this should be sufficient. For more advanced setups (e.g. with delegation or transfer), you can look into the JorEl.teams methods which allow you to specify agents and
delegates.

This works for both the `ask` and `json` methods.

```typescript
import {z} from "zod";

const getWeather = async ({city}: { city: string }) => {
  // Simulate weather lookup
  return {temperature: 22, conditions: "sunny"};
};

const response = await jorEl.ask("What's the weather in Sydney?", {
  tools: [{
    name: "get_weather",
    description: "Get the current weather for a city",
    executor: getWeather,
    params: z.object({
      city: z.string(),
    }),
  }]
});

console.log(response);
// The weather in Sydney is 22 degrees and sunny.
```

### Streaming with Tools

You can use the `stream` method to stream responses while utilizing tools and documents.

```typescript
import {z} from "zod";

// Will return a stream of strings
const stream = jorEl.stream("What's the weather in my city?", {
  documents: [{
    title: "Current location",
    content: "The user is currently in Sydney.",
  }],
  tools: [{
    name: "get_weather",
    description: "Get the current weather for a city",
    executor: getWeather,
    params: z.object({
      city: z.string(),
    }),
  }],
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
// The weather in Sydney is 22 degrees and sunny.
```

## Preview to agents

Agents allow you to define more complex interactions with the LLM, including delegation and transfer. Here's a simple example (which would be better solved with tools, but it should give you an idea
on how to set things up):

```typescript
const jorEl = new JorEl({openAI: true, logger: "console", logLevel: "debug"});

jorEl.team.addTools([
  {
    name: "get_weather",
    description: "Get the current temperature and conditions for a city",
    executor: getWeather,
    params: z.object({city: z.string()}),
  },
]);

const mainAgent = jorEl.team.addAgent({
  name: "main_agent",
  description: "Main agent who communicates between user and other agents.",
  systemMessageTemplate:
    "You are a helpful assistant. " +
    "You try to answer the user's questions to the best of your ability. " +
    "If you can't, you'll ask another agent for help. " +
    "These agents are available to you: {{delegates}}",
});

mainAgent.addDelegate({
  name: "weather_agent",
  description: "Can provide weather information for a given location.",
  systemMessageTemplate: "You are a weather agent. " +
    "You can provide weather information for a given location.",
  allowedTools: ["get_weather"],
});

const task = await jorEl.team.createTask("What is the weather in Sydney?");

const executedTask = await jorEl.team.executeTask(task, {
  limits: {
    maxIterations: 10,
    maxGenerations: 6,
    maxDelegations: 2,
  },
});

const {events, stats, tokens} = executedTask.eventsWithStatistics;

console.log("\nEvents:");
for (const event of events) {
  console.log(`- ${event.eventType}: ${event.action}`);
}

console.log("\nStatistics:");
console.log({stats, tokens});

console.log("\nResult:");
console.log(executedTask.result);

// Events:
// - generation: Agent main_agent generated assistant_with_tools message based on user message
// - delegation: Agent main_agent delegated to weather_agent
// - generation: Agent weather_agent generated assistant_with_tools message based on user message
// - toolUse: Agent weather_agent used tool get_weather
// - generation: Agent weather_agent generated assistant message based on assistant_with_tools message
// - threadChange: Agent weather_agent returned execution to agent main_agent (Main thread)
// - generation: Agent main_agent generated assistant message based on assistant_with_tools message
//
// Statistics:
// {
//   stats: { generations: 4, delegations: 1 },
//   tokens: { 'gpt-4o-mini': { input: 515, output: 77 } }
// }
//
// Result:
//   The current weather in Sydney is sunny with a temperature of 20°C.
```

Tasks, Agents, and Tools are easily serializable. 

Tasks can either be run to completion (or until a halt condition is met), or they be processed step-by-step.