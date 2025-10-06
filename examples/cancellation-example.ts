import { JorEl } from "../src";

async function demonstrateCancellation() {
  // Initialize JorEl with OpenAI
  const jorel = new JorEl({
    openAI: true,
  });

  // Create an AbortController for cancellation
  const controller = new AbortController();

  // Set up a timeout to cancel the request after 5 seconds
  const timeoutId = setTimeout(() => {
    console.log("Cancelling request after 5 seconds...");
    controller.abort();
  }, 5000);

  try {
    console.log("Starting text generation...");

    // Start a text generation with cancellation support
    const response = await jorel.text("Write a very long story about space exploration, at least 2000 words.", {
      model: "gpt-4",
      maxTokens: 2000,
      abortSignal: controller.signal, // Pass the abort signal
    });

    console.log("Generation completed:", response);
    clearTimeout(timeoutId);
  } catch (error) {
    if (error instanceof Error && error.message === "Request was aborted") {
      console.log("Request was successfully cancelled!");
    } else {
      console.error("Error:", error);
    }
    clearTimeout(timeoutId);
  }
}

async function demonstrateStreamCancellation() {
  // Initialize JorEl with OpenAI
  const jorel = new JorEl({
    openAI: true,
  });

  // Create an AbortController for cancellation
  const controller = new AbortController();

  // Set up a timeout to cancel the request after 3 seconds
  const timeoutId = setTimeout(() => {
    console.log("Cancelling stream after 3 seconds...");
    controller.abort();
  }, 3000);

  try {
    console.log("Starting streaming generation...");

    // Start a streaming generation with cancellation support
    const stream = jorel.stream("Write a very long story about artificial intelligence, at least 2000 words.", {
      model: "gpt-4",
      maxTokens: 2000,
      abortSignal: controller.signal, // Pass the abort signal
    });

    let totalContent = "";
    for await (const chunk of stream) {
      totalContent += chunk;
      process.stdout.write(chunk); // Stream output to console
    }

    console.log("\nStream completed. Total length:", totalContent.length);
    clearTimeout(timeoutId);
  } catch (error) {
    if (error instanceof Error && error.message === "Request was aborted") {
      console.log("\nStream was successfully cancelled!");
    } else {
      console.error("Error:", error);
    }
    clearTimeout(timeoutId);
  }
}

async function demonstrateEmbeddingCancellation() {
  // Initialize JorEl with OpenAI
  const jorel = new JorEl({
    openAI: true,
  });

  // Create an AbortController for cancellation
  const controller = new AbortController();

  // Cancel immediately to demonstrate cancellation
  setTimeout(() => {
    console.log("Cancelling embedding request...");
    controller.abort();
  }, 100);

  try {
    console.log("Starting embedding generation...");

    // Start an embedding generation with cancellation support
    const embedding = await jorel.embed("This is a test text for embedding generation.", {
      model: "text-embedding-ada-002",
      abortSignal: controller.signal, // Pass the abort signal
    });

    console.log("Embedding completed. Length:", embedding.length);
  } catch (error) {
    if (error instanceof Error && error.message === "Request was aborted") {
      console.log("Embedding request was successfully cancelled!");
    } else {
      console.error("Error:", error);
    }
  }
}

// Run examples
async function runExamples() {
  console.log("=== Cancellation Examples ===\n");

  console.log("1. Text Generation Cancellation:");
  await demonstrateCancellation();

  console.log("\n2. Stream Cancellation:");
  await demonstrateStreamCancellation();

  console.log("\n3. Embedding Cancellation:");
  await demonstrateEmbeddingCancellation();
}

// Only run if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

export { demonstrateCancellation, demonstrateEmbeddingCancellation, demonstrateStreamCancellation };
