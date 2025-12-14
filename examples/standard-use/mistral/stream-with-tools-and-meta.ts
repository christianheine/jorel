#!/usr/bin/env ts-node

import { config } from "dotenv";
import { z } from "zod";
import { JorEl } from "../../../src";
import { getWeather } from "../../_utilities/get-weather";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ mistral: true });

  // Register a model
  jorEl.providers.mistral.addModel("mistral-medium-latest");

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
    reasoningEffort: "medium",
    // streamBuffer: { disabled: true },
  });

  // Print each chunk
  for await (const chunk of stream) {
    process.stdout.write(JSON.stringify(chunk, null, 2));
    process.stdout.write("\n");
  }
};

void main();
