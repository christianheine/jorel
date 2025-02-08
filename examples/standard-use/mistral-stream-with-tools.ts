#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";
import { getWeather } from "../_utilities/get-weather";
import { z } from "zod";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ mistral: true }); // Uses process.env.MISTRAL_API_KEY

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
