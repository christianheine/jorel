#!/usr/bin/env ts-node

import { config } from "dotenv";
import { z } from "zod";
import { JorEl } from "../../../src";
import { getWeather } from "../../_utilities/get-weather";

config({ path: "../../../.env", quiet: true });

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

  // Will return a stream of chunks, and a response and messages object
  const stream = jorEl.streamWithMeta("What is the weather in Sydney?", {
    tools: [
      {
        name: "get_weather",
        description: "Get the current temperature and conditions for a city",
        executor: getWeather,
        params: z.object({ city: z.string() }),
      },
    ],
  });

  // Print each chunk
  for await (const chunk of stream) {
    if (chunk.type === "chunk") {
      process.stdout.write(chunk.content);
    } else {
      process.stdout.write("\n" + chunk.type + ":\n");
      process.stdout.write(JSON.stringify(chunk, null, 2));
      process.stdout.write("\n");
    }
  }

  process.stdout.write("\n");
};

void main();
