---
sidebar_position: 3
---

# Examples

JorEl includes a comprehensive set of runnable examples to help you get started quickly. These examples are kept in sync with the codebase and demonstrate real-world usage patterns.

## Running the Examples

All examples are located in the `/examples` directory of the repository. To run them:

```bash
# Clone the repository
git clone https://github.com/christianheine/jorel.git
cd jorel

# Install dependencies
npm install

# Set up your environment variables
cp .env.example .env
# Edit .env and add your API keys

# Run an example
npx ts-node examples/standard-use/open-ai/text.ts
```

## Example Categories

### Standard Use

Basic usage patterns for all supported providers:

**OpenAI Examples** ( `examples/standard-use/open-ai/` )
* `text.ts` - Simple text generation
* `text-with-metadata.ts` - Getting response metadata
* `text-with-parameters.ts` - Using generation parameters
* `text-with-tools.ts` - Tool usage with text generation
* `text-with-documents.ts` - Document-grounded responses
* `text-image.ts` - Vision capabilities
* `text-follow-up.ts` - Follow-up conversations
* `text-reasoning.ts` - Using reasoning models (o1, o3)
* `text-o3.ts` - o3 model specific features
* `text-cancellation.ts` - Cancelling requests
* `text-with-token-tracking.ts` - **NEW in v1.0.0** - Token tracking with tools
* `json.ts` - JSON response generation
* `json-schema.ts` - Structured JSON with schema
* `json-with-tools.ts` - Tools with JSON responses
* `stream.ts` - Basic streaming
* `stream-with-meta.ts` - Streaming with metadata
* `stream-with-tools.ts` - Streaming with tools
* `stream-with-buffering.ts` - Stream buffering
* `stream-reasoning.ts` - Streaming with reasoning models
* `stream-cancellation.ts` - **NEW in v1.0.0** - Cancelling streams
* `stream-cancellation-with-buffering.ts` - **NEW in v1.0.0** - Cancellation with buffering
* `stream-with-token-tracking.ts` - **NEW in v1.0.0** - Token tracking in streams
* `embeddings.ts` - Creating embeddings
* `generate-with-tools.ts` - Low-level tool usage
* `get-client.ts` - Accessing native provider clients

**Other Providers**
* `examples/standard-use/anthropic/` - Anthropic (Claude) examples
* `examples/standard-use/google-genai/` - Google Generative AI examples
* `examples/standard-use/vertex-ai/` - Google Vertex AI examples
* `examples/standard-use/groq/` - Groq examples
* `examples/standard-use/grok/` - Grok examples
* `examples/standard-use/mistral/` - Mistral AI examples
* `examples/standard-use/ollama/` - Ollama (local models) examples
* `examples/standard-use/open-router/` - OpenRouter examples

### Agent Examples

Advanced agent patterns and workflows:

**Agent Examples** ( `examples/agents/` )
* `open-ai-agent--01-simple.ts` - Simple single agent
* `open-ai-agent--02-transfer.ts` - Agent transfer patterns
* `open-ai-agent--03-delegation.ts` - Agent delegation patterns

### Provider API Examples

Direct provider API usage:

**Provider API Examples** ( `examples/provider-apis/` )
* `provider-apis-open-ai.ts` - OpenAI provider API
* `provider-apis-anthropic.ts` - Anthropic provider API
* `provider-apis-google-generative-ai.ts` - Google Gen AI provider API
* `provider-apis-advanced-with-tools.ts` - Advanced provider usage with tools

## Featured Examples

### New in v1.0.0

#### Token Tracking with Tools

See how to track token usage across multiple generations when using tools:

```typescript
// examples/standard-use/open-ai/text-with-token-tracking.ts
const { response, meta } = await jorEl.text(
  "What's the weather in Paris and what's the stock price of AAPL?",
  { tools },
  true
);

console.log(`Total input tokens: ${meta.inputTokens}`);
console.log(`Total output tokens: ${meta.outputTokens}`);
console.log(`Number of generations: ${meta.generations?.length || 1}`);
```

#### Request Cancellation

Learn how to cancel ongoing requests:

```typescript
// examples/standard-use/open-ai/text-cancellation.ts
const controller = new AbortController();

const promise = jorEl.text("Write a long essay", {
  abortSignal: controller.signal
});

setTimeout(() => controller.abort(), 5000);
```

#### Stream Cancellation with Buffering

Combine streaming, buffering, and cancellation:

```typescript
// examples/standard-use/open-ai/stream-cancellation-with-buffering.ts
const stream = jorEl.stream("Generate a story", {
  streamBuffer: { bufferTimeMs: 200 },
  abortSignal: controller.signal
});
```

### Tool Usage

#### Basic Tool Usage

```typescript
// examples/standard-use/open-ai/text-with-tools.ts
const response = await jorEl.text("What's the weather?", {
  tools: [{
    name: "get_weather",
    description: "Get weather for a city",
    executor: getWeather,
    params: z.object({ city: z.string() })
  }]
});
```

#### Tool Approval Workflow

```typescript
// examples/standard-use/open-ai/text-with-approval.ts
// Interactive approval of tool calls before execution
```

### Agent Workflows

#### Simple Agent

```typescript
// examples/agents/open-ai-agent--01-simple.ts
const agent = jorEl.team.addAgent({
  name: "weather_agent",
  description: "Weather specialist",
  allowedTools: ["get_weather"]
});

const task = await jorEl.team.createTask("What's the weather?");
const result = await jorEl.team.executeTask(task);
```

#### Agent Delegation

```typescript
// examples/agents/open-ai-agent--03-delegation.ts
// Main agent delegates subtasks to specialist agents
```

### Vision and Images

```typescript
// examples/standard-use/open-ai/text-image.ts
const image = await ImageContent.fromFile("./image.png");
const response = await jorEl.text(["What's in this image?", image]);
```

### Reasoning Models

```typescript
// examples/standard-use/open-ai/text-reasoning.ts
const response = await jorEl.text("Solve this logic puzzle", {
  model: "o3-mini",
  reasoningEffort: "high"
});
```

## Utility Functions

Many examples use shared utilities located in `examples/_utilities/` :
* `get-weather.ts` - Mock weather API
* `get-stock-value.ts` - Mock stock API
* `log.ts` - Console logging helpers

## Browse on GitHub

Visit the [examples directory on GitHub](https://github.com/christianheine/jorel/tree/master/examples) to browse all examples and see the latest additions.

## Contributing Examples

If you have a useful example you'd like to share, please submit a pull request! We're always looking for real-world usage patterns to help other developers.
