#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    openAiAzure: {
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiUrl: process.env.AZURE_OPENAI_ENDPOINT,
    },
  });

  jorEl.providers.openAiAzure.addModel("gpt-5-mini", true, {
    reasoningEffort: "minimal",
  });

  // Optional: Set system message
  jorEl.systemMessage = "Format everything you see as a JSON object. Make sure to use snake_case for attributes!";

  // Will return a JSON object
  const response = await jorEl.json("Format this: Name = John, Current Age = 30, City = Sydney");

  console.log(response);
  // { name: 'John', current_age: 30, city: 'Sydney' }
};

void main();
