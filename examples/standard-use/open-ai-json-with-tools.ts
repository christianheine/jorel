#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl, LlmToolKit } from "../../src";
import { getStockValue } from "../_utilities/get-stock-value";

config({ path: "../../.env" });

const main = async () => {
  const jorEl = new JorEl({
    openAI: { apiKey: process.env.OPENAI_API_KEY },
    systemMessage:
      "You are an expert in finance & stocks. Return stock price and volume for a given ticker symbol as JSON {ticker, stockPrice, marketVolume}.",
  });

  const tools = new LlmToolKit([
    {
      name: "get_stock_data",
      description: "Get stock data for a given ticker symbol (previous day)",
      executor: getStockValue, // Requires POLYGON API key
      params: {
        type: "object",
        properties: {
          tickerSymbol: { type: "string" },
        },
        required: ["tickerSymbol"],
      },
    },
  ]);

  const response = await jorEl.json("What is the current stock price for Apple?", { tools });

  console.log(response);
  // { ticker: 'AAPL', stockPrice: 243.36, marketVolume: 38846213 }
};

void main();
