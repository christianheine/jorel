import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

/**
 * Example demonstrating stream buffering to control chunk emission rate
 *
 * This example shows how to use the streamBuffer configuration to reduce
 * the frequency of chunk emissions, which can help with backpressure in
 * downstream systems like Reddit streams or frontend UIs.
 */
async function main() {
  const jorel = new JorEl({
    openAI: true,
  });

  const task =
    "Write a detailed explanation of how machine learning works, including neural networks, training processes, and real-world applications. Use around 200 words.";

  console.log("=== Without Buffering (Default) ===");

  let chunkCount = 0;
  let startTime = Date.now();

  for await (const chunk of jorel.stream(task, {
    model: "gpt-4o-mini",
    streamBuffer: { disabled: true }, // Explicitly disable buffering
  })) {
    chunkCount++;
    process.stdout.write(`[${chunkCount}] ${chunk}\n`);
  }

  const unbufferedTime = Date.now() - startTime;
  console.log(`\n\nUnbuffered: ${chunkCount} chunks in ${unbufferedTime}ms`);

  console.log("\n=== Stream with Metadata and Buffering ===");

  chunkCount = 0;
  startTime = Date.now();
  for await (const chunk of jorel.streamWithMeta(task, {
    model: "gpt-4o-mini",
    streamBuffer: { bufferTimeMs: 200 },
  })) {
    if (chunk.type === "chunk") {
      chunkCount++;
      process.stdout.write(chunk.content);
    } else if (chunk.type === "response") {
      console.log("\n\n=== Response ===\n");
      console.log(`Final response received (${chunk.content?.length} chars total)`);
    } else if (chunk.type === "messages") {
      console.log(`Messages updated, stop reason: ${chunk.stopReason}`);
    }
  }

  const bufferedTime = Date.now() - startTime;
  console.log(`Buffered: ${chunkCount} chunks in ${bufferedTime}ms`);
}

main().catch(console.error);
