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

  // Optional: Set system message
  jorEl.systemMessage = "Format everything you see as a JSON object. Make sure to use snakeCase for attributes!";

  // Will return a JSON object
  const response = await jorEl.json("Format this: Name = John, Age = 30, City = Sydney");

  console.log(response);
};

void main();
