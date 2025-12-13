#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    mistral: {
      retryConfig: {
        strategy: "backoff",
        backoff: {
          exponent: 2,
          initialInterval: 1000,
          maxInterval: 10000,
          maxElapsedTime: 30000,
        },
      },
      timeout: 1000,
    },
  });

  // Register a model
  jorEl.providers.mistral.addModel("mistral-medium-latest");

  // Get the underlying Mistral client
  const mistralClient = jorEl.providers.mistral.getClient();

  console.log(mistralClient._options.timeoutMs);
  console.log(mistralClient._options.retryConfig);
};

void main();
