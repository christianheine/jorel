import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAI: true });

  // Register a model
  jorEl.providers.openAi.addModel("gpt-5-nano");

  // Create an abort controller
  const controller = new AbortController();

  // Set up cancellation after 2 seconds
  setTimeout(() => {
    controller.abort();
  }, 2000);

  const response = await jorEl.text("Write a very long story about space exploration.", {
    model: "gpt-5-nano",
    abortSignal: controller.signal, // Pass the abort signal
  });

  console.log(response);
};

void main();
