#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    ollama: {},
  });

  // Register Ollama model
  jorEl.models.register({
    model: "llama3.2",
    provider: "ollama",
    setAsDefault: true,
  });

  // Will return a stream of strings
  const stream = jorEl.stream("Generate a merry Christmas song. 5 lines max.");

  // Print each chunk
  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }

  process.stdout.write("\n");
};

void main();
