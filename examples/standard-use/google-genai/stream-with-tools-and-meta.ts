#!/usr/bin/env ts-node

import { config } from "dotenv";
import { z } from "zod";
import { JorEl } from "../../../src";

import { getWeather } from "../../_utilities/get-weather";

config({ path: "../../../.env", quiet: true });

const getCityInfo = async (city: string) => {
  return {
    city,
    population: 5000000,
    landmarks: ["Sydney Opera House", "Sydney Harbour Bridge", "Royal Botanic Garden"],
  };
};

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ googleGenAi: true });

  // Register a model
  jorEl.providers.googleGenAi.addModel("gemini-3-pro-preview");

  // Will return a stream of chunks, and a response and messages object
  const stream = jorEl.streamWithMeta("What is the current weather andpopulation of Sydney?", {
    reasoningEffort: "high",
    tools: [
      {
        name: "get_weather",
        description: "Get the current temperature and conditions for a city",
        executor: getWeather,
        params: z.object({ city: z.string() }),
      },
      {
        name: "get_city_population",
        description: "Get the current population of a city",
        executor: getCityInfo,
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
