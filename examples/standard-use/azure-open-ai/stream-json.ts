#!/usr/bin/env ts-node

import { config } from "dotenv";
import z from "zod";
import { JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAiAzure: true });

  // Register a model
  jorEl.providers.openAiAzure.addModel("gpt-5-mini", true, {
    reasoningEffort: "minimal",
  });

  jorEl.systemMessage = "The location is 'Sydney'. The current date is '2/17/2025, 8:56:22 AM'";

  const stream = jorEl.stream("Return the current date, time and location as JSON.", {
    json: z.object({
      currentDate: z.string(),
      currentTime: z.string(),
      location: z.object({
        city: z.string(),
      }),
    }),
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }

  process.stdout.write("\n");
};

void main();
