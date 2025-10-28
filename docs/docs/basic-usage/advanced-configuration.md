---
sidebar_position: 9
---

# Advanced Configuration

JorEl provides advanced configuration options for fine-tuning LLM behavior, including model-specific parameters and defaults. This guide covers configuration options beyond the basics.

## Model-Specific Parameters

### Reasoning Effort

For reasoning models (like OpenAI's o1 and o3 series), you can control the computational effort:

```typescript
import { JorEl } from 'jorel';

const jorEl = new JorEl({ openAI: true });

const response = await jorEl.text(
  "Solve this complex logic puzzle...",
  {
    model: "o3-mini",
    reasoningEffort: "high" // Options: "minimal" | "low" | "medium" | "high"
  }
);
```

Reasoning effort affects:
* **Computational time**: Higher effort takes longer
* **Token usage**: Higher effort uses more tokens
* **Solution quality**: Higher effort may find better solutions

**Supported values:**
* `"minimal"` - Fastest, lowest cost
* `"low"` - Balanced for simple problems
* `"medium"` - Default for most problems (if supported)
* `"high"` - Maximum effort for complex problems

**Provider support:**
* OpenAI: Supported on o1 and o3 models
* Other providers: Ignored (no error)

### Verbosity

Control the detail level of model responses (currently OpenAI-specific):

```typescript
const response = await jorEl.text(
  "Explain quantum computing",
  {
    model: "gpt-4o",
    verbosity: "low" // Options: "low" | "medium" | "high"
  }
);
```

Verbosity affects:
* **Response length**: Higher verbosity = longer responses
* **Detail level**: More explanation and context
* **Token usage**: Higher verbosity uses more tokens

**Supported values:**
* `"low"` - Concise, to the point
* `"medium"` - Balanced detail level
* `"high"` - Detailed explanations

**Provider support:**
* OpenAI: Supported (may vary by model)
* Other providers: Ignored (no error)

### Max Tokens

Limit the maximum number of tokens in the response:

```typescript
const response = await jorEl.text(
  "Write an essay",
  {
    maxTokens: 500 // Limit to 500 tokens
  }
);
```

This is useful for:
* Controlling costs
* Ensuring responses fit in UI elements
* Preventing overly long responses

**Provider support:** All providers

## Model-Specific Defaults

You can configure default settings that apply whenever a specific model is used:

```typescript
const jorEl = new JorEl({ openAI: true });

// Set defaults for a specific model
jorEl.models.setModelSpecificDefaults("o3-mini", {
  reasoningEffort: "medium",
  temperature: null // Explicitly disable temperature
});

jorEl.models.setModelSpecificDefaults("gpt-4o", {
  temperature: 0.7,
  verbosity: "medium"
});

// Now all requests with o3-mini use medium reasoning effort
const response = await jorEl.text(
  "Solve this puzzle",
  { model: "o3-mini" }
  // reasoningEffort: "medium" is automatically applied
);
```

### Setting Defaults During Registration

You can also set defaults when registering a model:

```typescript
jorEl.models.register({
  model: "o3-mini",
  provider: "openai",
  defaults: {
    reasoningEffort: "high",
    temperature: null
  }
});

// Or using provider-specific methods
jorEl.providers.openAi.addModel("o3-mini", false, {
  reasoningEffort: "high",
  temperature: null
});
```

## Configuration Precedence

JorEl applies configuration in this order (highest to lowest priority):

1. **Request-level configuration** - Parameters passed directly to `text()`, `json()`, or `stream()`
2. **Model-specific defaults** - Defaults set for the specific model being used
3. **Instance-level configuration** - Defaults set on the JorEl instance
4. **Model overrides** - Automatic adjustments for model limitations

Example:

```typescript
const jorEl = new JorEl({
  openAI: true,
  temperature: 0 // Instance default
});

jorEl.models.setModelSpecificDefaults("gpt-4o", {
  temperature: 0.7, // Model default
  verbosity: "low"
});

// This request uses temperature: 1 (request-level wins)
const response1 = await jorEl.text("Hello", {
  model: "gpt-4o",
  temperature: 1
});

// This request uses temperature: 0.7 (model default wins)
const response2 = await jorEl.text("Hello", {
  model: "gpt-4o"
});

// This request uses temperature: 0 (instance default wins)
const response3 = await jorEl.text("Hello", {
  model: "gpt-4o-mini" // No model-specific defaults
});
```

## Temperature Handling

Temperature can be explicitly unset using `null` , which is useful for models that don't support it:

```typescript
// Explicitly disable temperature for a request
const response = await jorEl.text(
  "Solve this problem",
  {
    model: "o3-mini",
    temperature: null // Don't send temperature parameter
  }
);

// Set as default for a model
jorEl.models.setModelSpecificDefaults("o3-mini", {
  temperature: null
});
```

JorEl automatically handles temperature for models that don't support it (like o1 and o3 series), but you can also be explicit.

## Stream Buffering Configuration

Control how streaming chunks are emitted:

```typescript
const stream = jorEl.stream("Generate a story", {
  streamBuffer: {
    bufferTimeMs: 200, // Wait 200ms before emitting buffered content
    disabled: false     // Set to true to disable buffering
  }
});
```

See [Generating Responses](./generating-responses.md#stream-buffering) for more details.

## Model Override System

JorEl automatically adjusts for model limitations:

```typescript
// When using a model that doesn't support system messages
const response = await jorEl.text("Hello", {
  model: "o3-mini",
  systemMessage: "Be helpful" // Automatically filtered out
});
// JorEl logs: "System messages are not supported for o3-mini and will be ignored"

// When using a model that doesn't support temperature
const response2 = await jorEl.text("Hello", {
  model: "o3-mini",
  temperature: 0.7 // Automatically removed
});
// JorEl logs: "Temperature is not supported for o3-mini and will be ignored"
```

This happens automatically - no action needed.

## Combining Advanced Options

You can combine multiple advanced options:

```typescript
const response = await jorEl.text(
  "Solve this complex problem: ...",
  {
    model: "o3-mini",
    reasoningEffort: "high",
    maxTokens: 1000,
    temperature: null,
    abortSignal: controller.signal,
    streamBuffer: { bufferTimeMs: 100 }
  }
);
```

## Best Practices

1. **Set model-specific defaults** for models you use frequently
2. **Use reasoningEffort judiciously** - higher values significantly increase cost
3. **Always set maxTokens** in production to control costs
4. **Use null temperature explicitly** for reasoning models to avoid confusion
5. **Combine with cancellation** for user-facing applications
6. **Monitor token usage** when using high verbosity or reasoning effort

## Provider-Specific Behavior

Different providers handle advanced parameters differently:

| Parameter | OpenAI | Anthropic | Google | Others |
|-----------|--------|-----------|--------|--------|
| `reasoningEffort` | ✅ Certain models | ❌ Ignored | ❌ Ignored | ❌ Ignored |
| `verbosity` | ✅ Supported | ❌ Ignored | ❌ Ignored | ❌ Ignored |
| `maxTokens` | ✅ Supported | ✅ Supported | ✅ Supported | ✅ Supported |
| `temperature` | ✅ Supported | ✅ Supported | ✅ Supported | ✅ Most support |

Parameters are safely ignored when not supported (no errors thrown).

## Examples

Working examples are available in the repository:
* `examples/standard-use/open-ai/text-reasoning.ts` - Reasoning effort examples
* `examples/standard-use/open-ai/text-with-parameters.ts` - Advanced parameters
* `examples/standard-use/open-ai/stream-reasoning.ts` - Streaming with reasoning
