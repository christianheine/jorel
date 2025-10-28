---
sidebar_position: 7
---

# Token Tracking

JorEl automatically tracks token usage across all generations, including complex scenarios where multiple API calls are made due to tool usage. This helps you monitor costs and optimize your LLM usage.

## Basic Token Tracking

When you request metadata from `text` , `json` , or `streamWithMeta` methods, JorEl includes token usage information:

```typescript
import { JorEl } from 'jorel';

const jorEl = new JorEl({ openAI: true });

const { response, meta } = await jorEl.text(
  "What is the capital of France?",
  { model: "gpt-4o-mini" },
  true // Request metadata
);

console.log(meta);
// {
//   model: 'gpt-4o-mini',
//   provider: 'openai',
//   temperature: 0,
//   durationMs: 730,
//   inputTokens: 26,
//   outputTokens: 16
// }
```

## Multi-Generation Token Tracking

When using tools, JorEl often makes multiple API calls to the LLM:
1. Initial generation: Model decides to call tools
2. Tool execution: Your functions are called
3. Subsequent generation(s): Model synthesizes the final answer with tool results

Starting in v1.0.0, JorEl accurately tracks cumulative token usage across all these generations:

```typescript
import { JorEl } from 'jorel';
import { z } from 'zod';

const jorEl = new JorEl({ openAI: true });

const { response, meta } = await jorEl.text(
  "What's the weather in Paris and what's the stock price of AAPL?",
  {
    tools: [{
      name: "get_weather",
      description: "Get weather for a city",
      executor: async ({ city }) => ({ temperature: 22, conditions: "sunny" }),
      params: z.object({ city: z.string() })
    }, {
      name: "get_stock_price",
      description: "Get stock price",
      executor: async ({ ticker }) => ({ price: 150.25 }),
      params: z.object({ ticker: z.string() })
    }]
  },
  true
);

console.log(meta.inputTokens);   // Total input tokens across all generations
console.log(meta.outputTokens);  // Total output tokens across all generations
console.log(meta.durationMs);    // Total duration
```

## Generation Details

When multiple generations occur, the metadata includes a `generations` array with details about each individual API call:

```typescript
const { response, meta } = await jorEl.text(
  "What's the weather in Sydney?",
  {
    tools: [{
      name: "get_weather",
      executor: getWeather,
      params: weatherSchema
    }]
  },
  true
);

if (meta.generations && meta.generations.length > 1) {
  console.log(`Made ${meta.generations.length} API calls`);
  
  meta.generations.forEach((gen, index) => {
    console.log(`Generation ${index + 1}:`);
    console.log(`  Type: ${gen.hadToolCalls ? "Tool Call Request" : "Final Response"}`);
    console.log(`  Model: ${gen.model}`);
    console.log(`  Input Tokens: ${gen.inputTokens}`);
    console.log(`  Output Tokens: ${gen.outputTokens}`);
    console.log(`  Duration: ${gen.durationMs}ms`);
  });
}
```

The `generations` array is only included when multiple generations occur, keeping the response lightweight for simple requests.

## Streaming with Token Tracking

Token tracking also works with streaming responses. Use `streamWithMeta` to access token information:

```typescript
const stream = jorEl.streamWithMeta(
  "What's the weather in New York?",
  { tools: [weatherTool] }
);

for await (const chunk of stream) {
  if (chunk.type === "chunk") {
    process.stdout.write(chunk.content);
  } else if (chunk.type === "response") {
    console.log("\nToken usage:", {
      input: chunk.meta.inputTokens,
      output: chunk.meta.outputTokens,
      duration: chunk.meta.durationMs
    });
  }
}
```

## Token Tracking with Agents

When using JorEl's agent system, token usage is automatically tracked across all agent interactions:

```typescript
const task = await jorEl.team.createTask("Research topic X");

const result = await jorEl.team.executeTask(task, {
  limits: { maxIterations: 10 }
});

const { tokens } = result.eventsWithStatistics;

console.log(tokens);
// {
//   'gpt-4o-mini': { input: 1250, output: 380 },
//   'gpt-4': { input: 450, output: 120 }
// }
```

Token usage is grouped by model, making it easy to calculate costs across different models.

## Provider Support

Token tracking is available for all providers that report token usage:
* **OpenAI**: Full support
* **Anthropic**: Full support
* **Google Vertex AI**: Full support
* **Google Generative AI**: Full support
* **Groq**: Full support
* **Grok**: Full support
* **Mistral**: Full support
* **Ollama**: Limited (depends on model)

When a provider doesn't report token counts, the fields will be `undefined` .

## Cost Calculation

You can use token counts to estimate costs:

```typescript
const COST_PER_1K_INPUT = 0.00015;  // GPT-4o-mini
const COST_PER_1K_OUTPUT = 0.0006;

const { meta } = await jorEl.text(prompt, {}, true);

const cost = 
  (meta.inputTokens / 1000 * COST_PER_1K_INPUT) +
  (meta.outputTokens / 1000 * COST_PER_1K_OUTPUT);

console.log(`Request cost: $${cost.toFixed(6)}`);
```

## Best Practices

1. **Always request metadata** when you need to track usage or costs
2. **Check the generations array** to understand multi-step tool usage patterns
3. **Monitor token usage** in production to optimize prompts and tools
4. **Use token tracking with agents** to understand complex task costs
5. **Consider caching** expensive tool results to reduce token usage

## Examples

You can find complete working examples in the repository:
* `examples/standard-use/open-ai/text-with-token-tracking.ts`
* `examples/standard-use/open-ai/stream-with-token-tracking.ts`
