#!/usr/bin/env ts-node

import { config } from "dotenv";
import { z } from "zod";
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

  jorEl.systemMessage = "The location is 'Sydney'. The current date is '2/17/2025, 8:56:22 AM'";

  const response = await jorEl.json("Return the current date, time and location as JSON.", {
    jsonSchema: z.object({
      currentDate: z.string(),
      currentTime: z.string(),
      location: z.object({
        city: z.string(),
      }),
    }),
  });

  console.log(response);
  // {
  //   currentDate: '2/17/2025',
  //   currentTime: '8:56:22 AM',
  //   location: { city: 'Sydney' }
  // }
};

void main();
