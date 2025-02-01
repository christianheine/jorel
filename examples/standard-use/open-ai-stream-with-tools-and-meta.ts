#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";
import { getWeather } from "../_utilities/get-weather";
import { z } from "zod";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    openAI: { apiKey: process.env.OPENAI_API_KEY },
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
      process.stdout.write("\n\n" + chunk.type + ":\n");
      process.stdout.write(JSON.stringify(chunk, null, 2));
    }
  }

  process.stdout.write("\n");
};

void main();
