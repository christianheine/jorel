#!/usr/bin/env ts-node

import { config } from "dotenv";
import { z } from "zod";
import { JorEl } from "../../../src";
import { getWeather } from "../../_utilities/get-weather";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ groq: true });

  // Register a model
  jorEl.providers.groq.addModel("openai/gpt-oss-120b");

  // Will return a stream of strings
  const stream = jorEl.stream("What is the weather in Sydney?", {
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
    process.stdout.write(chunk);
  }

  process.stdout.write("\n");
};

void main();
