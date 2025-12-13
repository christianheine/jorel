#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAI: true });

  // Register a model
  jorEl.providers.openAi.addModel("gpt-5-nano");

  jorEl.models.setModelSpecificDefaults("gpt-5-nano", {
    reasoningEffort: "high",
    verbosity: "low",
  });

  jorEl.models.setDefault("gpt-5-nano");

  // Will return a string
  const stream = jorEl.stream("How many r's are in `strawberry`?");

  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }

  process.stdout.write("\n");
};

void main();
