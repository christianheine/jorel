#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl, LlmToolKit } from "../../../src";
import { getStockValue } from "../../_utilities/get-stock-value";
import { getWeather } from "../../_utilities/get-weather";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  const jorEl = new JorEl({ openAI: true, logger: "console", logLevel: "silly" });

  // Register a model
  jorEl.providers.openAi.addModel("gpt-5-nano");

  // Defining a toolkit is optional in this scenario, but useful for organizing and reusing tools
  const tools = new LlmToolKit([
    {
      name: "get_stock_data",
      description: "Get stock data for a given ticker symbol (previous day)",
      executor: getStockValue, // Requires Polygon.io API key
      params: {
        type: "object",
        properties: {
          tickerSymbol: { type: "string" },
        },
        required: ["tickerSymbol"],
      },
    },
    {
      name: "get_weather",
      description: "Get the current temperature and conditions for a city",
      executor: getWeather,
      params: {
        type: "object",
        properties: {
          city: { type: "string" },
        },
        required: ["city"],
      },
    },
  ]);

  const response = await jorEl.text("What is the current stock price for Amazon, and the weather in Sydney?", {
    tools,
  });

  console.log(response);
  // The current stock price for Amazon (AMZN) is $224.19.
  // In Sydney, the weather is partly cloudy with a temperature of 27.2°C.
};

void main();
