---
sidebar_position: 8
---

# Cancellation Support

JorEl supports cancelling ongoing LLM generations using the standard `AbortSignal` API. This is useful for implementing timeouts, user-initiated cancellations, or cleaning up when operations are no longer needed.

## Basic Cancellation

Use `AbortController` to create a cancellable request:

```typescript
import { JorEl } from 'jorel';

const jorEl = new JorEl({ openAI: true });

// Create an abort controller
const controller = new AbortController();

// Start the generation
const promise = jorEl.text(
  "Write a long essay about the history of computing",
  {
    model: "gpt-4o-mini",
    abortSignal: controller.signal
  }
);

// Cancel after 5 seconds
setTimeout(() => {
  console.log("Cancelling request...");
  controller.abort();
}, 5000);

try {
  const response = await promise;
  console.log(response);
} catch (error) {
  if (error.name === 'AbortError') {
    console.log("Request was cancelled");
  } else {
    throw error;
  }
}
```

## Cancelling Streaming Responses

Cancellation works seamlessly with streaming:

```typescript
const controller = new AbortController();

const stream = jorEl.stream(
  "Generate a very long story",
  {
    abortSignal: controller.signal
  }
);

// Cancel after receiving some chunks
let chunkCount = 0;
try {
  for await (const chunk of stream) {
    process.stdout.write(chunk);
    chunkCount++;
    
    if (chunkCount > 10) {
      controller.abort();
    }
  }
} catch (error) {
  if (error.name === 'AbortError') {
    console.log("\nStream cancelled after 10 chunks");
  }
}
```

## Cancellation with Stream Buffering

When using stream buffering, cancellation will gracefully end the stream after flushing any buffered content:

```typescript
const controller = new AbortController();

const stream = jorEl.stream(
  "Generate a story",
  {
    streamBuffer: { bufferTimeMs: 200 },
    abortSignal: controller.signal
  }
);

// Cancel after 2 seconds
setTimeout(() => controller.abort(), 2000);

try {
  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }
} catch (error) {
  console.log("\nStream ended gracefully");
}
```

## Timeout Pattern

A common use case is implementing timeouts:

```typescript
async function generateWithTimeout(prompt: string, timeoutMs: number) {
  const controller = new AbortController();
  
  // Set up timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  try {
    const response = await jorEl.text(prompt, {
      abortSignal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Use it
try {
  const response = await generateWithTimeout(
    "Explain quantum computing",
    10000 // 10 second timeout
  );
  console.log(response);
} catch (error) {
  console.error(error.message);
}
```

## Cancellation with Tools

When using tools, cancellation will stop the generation and any pending tool executions:

```typescript
import { z } from 'zod';

const controller = new AbortController();

// Tool that takes time to execute
const slowTool = {
  name: "fetch_data",
  description: "Fetch data from API",
  executor: async ({ url }) => {
    await new Promise(resolve => setTimeout(resolve, 5000));
    return { data: "result" };
  },
  params: z.object({ url: z.string() })
};

const promise = jorEl.text(
  "Fetch data from https://api.example.com",
  {
    tools: [slowTool],
    abortSignal: controller.signal
  }
);

// Cancel before tool finishes
setTimeout(() => controller.abort(), 2000);

try {
  await promise;
} catch (error) {
  console.log("Request cancelled before tool completed");
}
```

## Cancellation with Metadata

You can check if a request was cancelled in the metadata:

```typescript
const controller = new AbortController();

setTimeout(() => controller.abort(), 1000);

const { response, stopReason } = await jorEl.text(
  "Generate text",
  { abortSignal: controller.signal },
  true
).catch(error => {
  // If cancelled during generation
  return { response: "", stopReason: "userCancelled" };
});

if (stopReason === "userCancelled") {
  console.log("Generation was cancelled");
}
```

## User-Initiated Cancellation

Here's a practical example with user interaction:

```typescript
import readline from 'readline';

async function interactiveCancellation() {
  const controller = new AbortController();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Listen for user pressing 'q' to cancel
  process.stdin.on('keypress', (str, key) => {
    if (str === 'q') {
      console.log("\nCancelling...");
      controller.abort();
    }
  });
  
  console.log("Generating response... (press 'q' to cancel)\n");
  
  const stream = jorEl.stream(
    "Write a detailed explanation of machine learning",
    { abortSignal: controller.signal }
  );
  
  try {
    for await (const chunk of stream) {
      process.stdout.write(chunk);
    }
  } catch (error) {
    console.log("\n\nCancelled by user");
  }
  
  rl.close();
}
```

## Provider Support

Cancellation support varies by provider:

| Provider | Non-Streaming | Streaming | Notes |
|----------|---------------|-----------|-------|
| **OpenAI** | ✅ Full | ✅ Full | Complete support |
| **Anthropic** | ✅ Full | ✅ Full | Complete support |
| **Google Vertex AI** | ⚠️ Partial | ⚠️ Partial | May not cancel immediately |
| **Google Generative AI** | ⚠️ Partial | ⚠️ Partial | May not cancel immediately |
| **Groq** | ✅ Full | ✅ Full | Complete support |
| **Grok** | ✅ Full | ✅ Full | Complete support |
| **Mistral** | ✅ Full | ✅ Full | Complete support |
| **Ollama** | ⚠️ Partial | ⚠️ Partial | Depends on local setup |

## Important Notes

1. **Not all providers support immediate cancellation** - Some may complete the current operation before stopping
2. **Tool executors are not automatically cancelled** - You need to handle AbortSignal in your tool implementations if they perform long operations
3. **Cancelled requests throw an AbortError** - Always handle this error type appropriately
4. **Buffered streams flush before cancelling** - This ensures you don't lose content that's already been generated
5. **Check stopReason in metadata** - When a request is cancelled,  `stopReason` will be `"userCancelled"`

## Implementing Cancellable Tools

If your tools perform long operations, you should check the AbortSignal:

```typescript
const cancellableTool = {
  name: "process_data",
  description: "Process large dataset",
  executor: async ({ data }, context, secureContext) => {
    // Check if already cancelled
    if (context.abortSignal?.aborted) {
      throw new Error("Operation cancelled");
    }
    
    // Perform work in chunks, checking signal periodically
    for (let i = 0; i < 100; i++) {
      if (context.abortSignal?.aborted) {
        throw new Error("Operation cancelled");
      }
      
      // Do some work
      await processChunk(data, i);
    }
    
    return { success: true };
  },
  params: z.object({ data: z.string() })
};
```

Note: Currently, you would need to pass the AbortSignal through the context parameter manually when calling JorEl methods with tools.

## Examples

You can find complete working examples in the repository:
* `examples/standard-use/open-ai/text-cancellation.ts`
* `examples/standard-use/open-ai/stream-cancellation.ts`
* `examples/standard-use/open-ai/stream-cancellation-with-buffering.ts`
