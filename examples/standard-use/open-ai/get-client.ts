#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    openAI: {
      maxRetries: 3,
      timeout: 10000,
    },
  });

  // Register a model
  jorEl.providers.openAi.addModel("gpt-5-nano");

  // Get the underlying OpenAI client
  const openAiClient = jorEl.providers.openAi.getClient();

  console.log(openAiClient.baseURL);
  console.log(openAiClient.maxRetries);
  console.log(openAiClient.timeout);
};

void main();
