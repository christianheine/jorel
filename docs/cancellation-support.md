# Cancellation Support in JorEl

JorEl now supports request cancellation using the standard Web API `AbortSignal` . This allows you to cancel ongoing LLM operations to avoid unnecessary token usage and improve user experience.

## Overview

Cancellation support has been added to all major JorEl methods:
* `generate()` - Cancel response generation
* `text()` - Cancel text generation
* `json()` - Cancel JSON generation
* `stream()` - Cancel streaming responses
* `streamWithMeta()` - Cancel streaming with metadata
* `embed()` - Cancel embedding generation

## How It Works

Cancellation is implemented using the standard `AbortController` and `AbortSignal` APIs:

1. Create an `AbortController`
2. Pass the `controller.signal` to any JorEl method via the `abortSignal` config option
3. Call `controller.abort()` to cancel the request
4. The method will throw an error with the message "Request was aborted"

## Basic Usage

### Text Generation Cancellation

```typescript
import { JorEl } from "jorel";

const jorel = new JorEl({ openAI: true });

// Create an abort controller
const controller = new AbortController();

// Set up cancellation after 5 seconds
setTimeout(() => {
  controller.abort();
}, 5000);

try {
  const response = await jorel.text(
    "Write a very long story about space exploration.",
    {
      model: "gpt-4",
      abortSignal: controller.signal, // Pass the abort signal
    }
  );
  console.log("Response:", response);
} catch (error) {
  if (error.message === "Request was aborted") {
    console.log("Request was cancelled!");
  }
}
```

### Streaming Cancellation

```typescript
const controller = new AbortController();

// Cancel after 3 seconds
setTimeout(() => controller.abort(), 3000);

try {
  const stream = jorel.stream(
    "Generate a long response...",
    {
      model: "gpt-4",
      abortSignal: controller.signal,
    }
  );

  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }
} catch (error) {
  if (error.message === "Request was aborted") {
    console.log("\nStream was cancelled!");
  }
}
```

### Embedding Cancellation

```typescript
const controller = new AbortController();

// Cancel after 2 seconds
setTimeout(() => controller.abort(), 2000);

try {
  const embedding = await jorel.embed(
    "Text to embed",
    {
      model: "text-embedding-ada-002",
      abortSignal: controller.signal,
    }
  );
  console.log("Embedding:", embedding);
} catch (error) {
  if (error.message === "Request was aborted") {
    console.log("Embedding was cancelled!");
  }
}
```

## Advanced Usage

### User-Initiated Cancellation

```typescript
class LLMService {
  private currentController: AbortController | null = null;

  async generateResponse(prompt: string) {
    // Cancel any existing request
    this.cancel();

    // Create new controller for this request
    this.currentController = new AbortController();

    try {
      const response = await jorel.text(prompt, {
        model: "gpt-4",
        abortSignal: this.currentController.signal,
      });
      return response;
    } finally {
      this.currentController = null;
    }
  }

  cancel() {
    if (this.currentController) {
      this.currentController.abort();
      this.currentController = null;
    }
  }
}

// Usage
const service = new LLMService();

// Start generation
const responsePromise = service.generateResponse("Tell me about AI");

// User clicks cancel button
document.getElementById("cancel-btn").addEventListener("click", () => {
  service.cancel();
});
```

### Timeout-Based Cancellation

```typescript
async function generateWithTimeout(prompt: string, timeoutMs: number) {
  const controller = new AbortController();
  
  // Set up timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await jorel.text(prompt, {
      model: "gpt-4",
      abortSignal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.message === "Request was aborted") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Generate with 30-second timeout
try {
  const response = await generateWithTimeout("Long prompt...", 30000);
  console.log(response);
} catch (error) {
  console.error("Generation failed:", error.message);
}
```

### React Hook Example

```typescript
import { useState, useCallback } from 'react';
import { JorEl } from 'jorel';

function useJorElGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [controller, setController] = useState<AbortController | null>(null);

  const generate = useCallback(async (prompt: string) => {
    // Cancel any existing generation
    if (controller) {
      controller.abort();
    }

    const newController = new AbortController();
    setController(newController);
    setIsGenerating(true);

    try {
      const response = await jorel.text(prompt, {
        model: "gpt-4",
        abortSignal: newController.signal,
      });
      
      return response;
    } catch (error) {
      if (error.message !== "Request was aborted") {
        throw error;
      }
      return null; // Cancelled
    } finally {
      setIsGenerating(false);
      setController(null);
    }
  }, [controller]);

  const cancel = useCallback(() => {
    if (controller) {
      controller.abort();
    }
  }, [controller]);

  return { generate, cancel, isGenerating };
}

// Usage in component
function ChatComponent() {
  const { generate, cancel, isGenerating } = useJorElGeneration();
  
  return (
    <div>
      <button 
        onClick={() => generate("Tell me a story")}
        disabled={isGenerating}
      >
        Generate
      </button>
      
      {isGenerating && (
        <button onClick={cancel}>
          Cancel
        </button>
      )}
    </div>
  );
}
```

## Provider Support

Currently, cancellation support is implemented for:

* ✅ **OpenAI Provider** - Full AbortSignal support for all methods
* ✅ **Anthropic Provider** - Full AbortSignal support for all methods  
* ✅ **Google GenAI Provider** - Full AbortSignal support for all methods
* ✅ **Mistral Provider** - Full AbortSignal support for all methods
* ✅ **Ollama Provider** - Native AbortableAsyncIterator support for streaming, fallback for others
* ⚠️ **Google Vertex AI Provider** - Fallback approach (pre-request + streaming checks)
* ✅ **Groq/Grok/OpenRouter Providers** - Inherit full support from OpenAI

### Adding Cancellation to Custom Providers

If you're implementing a custom provider, add cancellation support by:

1. Accept `abortSignal` in the config parameter
2. Pass the signal to your HTTP client
3. Check `abortSignal?.aborted` in streaming loops
4. Handle abort events appropriately

```typescript
class CustomProvider implements LlmCoreProvider {
  async generateResponse(model: string, messages: LlmMessage[], config: LlmGenerationConfig = {}) {
    const response = await fetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ model, messages }),
      signal: config.abortSignal, // Pass abort signal to fetch
    });
    
    return response.json();
  }

  async *generateResponseStream(model: string, messages: LlmMessage[], config: LlmGenerationConfig = {}) {
    const response = await fetch('/api/stream', {
      method: 'POST',
      body: JSON.stringify({ model, messages }),
      signal: config.abortSignal, // Pass abort signal to fetch
    });

    const reader = response.body?.getReader();
    
    while (true) {
      // Check for cancellation
      if (config.abortSignal?.aborted) {
        throw new Error("Request was aborted");
      }

      const { done, value } = await reader.read();
      if (done) break;
      
      // Process and yield chunk
      yield processChunk(value);
    }
  }
}
```

## Error Handling

When a request is cancelled, JorEl throws an error with the message "Request was aborted". Always check for this specific message to handle cancellation gracefully:

```typescript
try {
  const response = await jorel.text(prompt, { abortSignal: controller.signal });
  // Handle success
} catch (error) {
  if (error instanceof Error && error.message === "Request was aborted") {
    // Handle cancellation
    console.log("User cancelled the request");
  } else {
    // Handle other errors
    console.error("Generation failed:", error);
  }
}
```

## Best Practices

1. **Always handle cancellation errors** - Check for "Request was aborted" message
2. **Clean up timeouts** - Clear timeouts when requests complete or fail
3. **Cancel previous requests** - When starting new requests, cancel any ongoing ones
4. **Provide user feedback** - Show cancellation status to users
5. **Use timeouts for long operations** - Prevent requests from running indefinitely
6. **Test cancellation scenarios** - Ensure your app handles cancellation gracefully

## Limitations

1. **Provider-specific** - Not all providers may support cancellation yet
2. **Network requests** - Cancellation may not immediately stop network traffic
3. **Tool calls** - Individual tool executions may not be immediately cancellable
4. **Buffered streams** - Some buffering may continue briefly after cancellation
