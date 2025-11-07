import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAI: true });

  // Create an abort controller
  const controller = new AbortController();

  // Set up cancellation after 2 seconds
  setTimeout(() => {
    controller.abort();
  }, 2000);

  const stream = jorEl.streamWithMeta("Write a very long story about space exploration.", {
    model: "gpt-4.1-mini",
    abortSignal: controller.signal, // Pass the abort signal
  });

  for await (const chunk of stream) {
    if (chunk.type === "chunk") {
      process.stdout.write(chunk.content);
    } else {
      process.stdout.write("\n" + chunk.type + ":\n");
      process.stdout.write(JSON.stringify(chunk, null, 2));
      process.stdout.write("\n");
    }
  }

  process.stdout.write("\n");
};

void main();
