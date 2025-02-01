#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";
import { getStockValue } from "../_utilities/get-stock-value";
import { z } from "zod";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    openAI: { apiKey: process.env.OPENAI_API_KEY },
    systemMessage:
      "You are an expert in finance & stocks. Return stock price and " +
      "volume for a given ticker symbol as JSON " +
      "{ticker, stockPrice, marketVolume}.",
  });

  const response = await jorEl.json(
    "What is the current stock price for Apple?", {
    tools: [
      {
        name: "get_stock_data",
        description: "Get stock data for a given ticker symbol (previous day)",
        executor: getStockValue, // Requires POLYGON API key
        params: z.object({ tickerSymbol: z.string() }),
      },
    ],
  });

  console.log(response);
  // { ticker: 'AAPL', stockPrice: 237.59, marketVolume: 53505269 }
};

void main();
