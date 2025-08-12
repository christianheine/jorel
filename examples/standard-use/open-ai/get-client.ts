#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    openAI: {
      maxRetries: 3,
      timeout: 10000,
    },
  });

  // Get the underlying OpenAI client
  const openAiClient = jorEl.providers.openAi.getClient();

  console.log(openAiClient.baseURL);
  console.log(openAiClient.maxRetries);
  console.log(openAiClient.timeout);
};

void main();
