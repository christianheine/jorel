#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl();

  jorEl.providers.registerOllama({ defaultTemperature: 0.2 });

  jorEl.systemMessage = "You are a helpful llama.";

  // Register Ollama model
  jorEl.models.register({
    model: "llama3.2",
    provider: "ollama",
    setAsDefault: true,
  });

  // Will return a string
  const response = await jorEl.ask("What is the capital of France?");

  console.log(response);
};

void main();
