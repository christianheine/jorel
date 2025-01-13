#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl, LlmToolKit } from "../../src";
import { getStockValue } from "../_utilities/get-stock-value";
import { getWeather } from "../_utilities/get-weather";
import { z } from "zod";

config({ path: "../../.env" });

const main = async () => {
  const jorEl = new JorEl({ openAI: true }); // Uses process.env.OPENAI_API_KEY

  const tools = new LlmToolKit([
    {
      name: "get_stock_data",
      description: "Get stock data for a given ticker symbol (previous day)",
      executor: getStockValue, // Requires Polygon.io API key
      params: z.object({ tickerSymbol: z.string() }),
    },
    {
      name: "get_weather",
      description: "Get the current temperature and conditions for a city",
      executor: getWeather, // Requires a Weather API key
      params: z.object({ city: z.string() }),
    },
  ]);

  const response = await jorEl.ask("What is the current stock price for Apple, and the weather in Sydney?", { tools });

  console.log(response);
  // The current stock price for Amazon (AMZN) is $224.19.
  // In Sydney, the weather is partly cloudy with a temperature of 27.2°C.
};

void main();
