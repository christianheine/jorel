#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl, LlmToolKit } from "../../src";
import { getWeather } from "../_utilities/get-weather";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    openAI: { apiKey: process.env.OPENAI_API_KEY },
  });

  const tools = new LlmToolKit([
    {
      name: "get_weather",
      description: "Get the current temperature and conditions for a city",
      executor: getWeather, // Requires a Weather API key
      params: {
        type: "object",
        properties: {
          city: { type: "string" },
        },
        required: ["city"],
      },
    },
  ]);

  // Will return a stream of strings
  const stream = jorEl.stream("What is the weather in Sydney?", { tools });

  // Print each chunk
  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }

  process.stdout.write("\n");
};

void main();
