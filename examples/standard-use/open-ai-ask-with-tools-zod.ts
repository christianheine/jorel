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
      executor: getStockValue, // Returns random data
      params: z.object({ tickerSymbol: z.string() }),
    },
    {
      name: "get_weather",
      description: "Get the current temperature and conditions for a city",
      executor: getWeather, // Returns fixed data
      params: z.object({ city: z.string() }),
    },
  ]);

  const { response, meta, messages } = await jorEl.ask(
    "What is the current stock price for Apple, and the weather in Sydney?",
    { tools },
    true,
  );

  console.log(response);
  // The current stock price for Apple (AAPL) is approximately $755.99.
  // In Sydney, the weather is sunny with a temperature of 25°C.

  console.log(meta);
  // {
  //   model: 'gpt-4o-mini',
  //   provider: 'openai',
  //   durationMs: 975,
  //   inputTokens: 223,
  //   outputTokens: 35
  // }

  console.dir(messages, { depth: null });
  // [
  //   {
  //     id: '73897542-c3be-4865-9215-6cc930ffb707',
  //     role: 'system',
  //     content: 'You are a helpful assistant.',
  //     createdAt: 1737504817895
  //   },
  //   {
  //     id: 'dca46163-5479-4dc3-94ac-57c04ed739d8',
  //     role: 'user',
  //     content: 'What is the current stock price for Apple, and the weather in Sydney?',
  //     createdAt: 1737504817895
  //   },
  //   {
  //     id: '846546b0-a5a5-4b4f-b1ce-30c8941b945f',
  //     role: 'assistant_with_tools',
  //     content: null,
  //     toolCalls: [
  //       {
  //         id: 'cc9660c1-1026-4c91-b49a-7f3d243aa224',
  //         request: {
  //           id: 'call_cCT8bttlcUUM1KWRFXFLd854',
  //           function: {
  //             name: 'get_stock_data',
  //             arguments: { tickerSymbol: 'AAPL' }
  //           }
  //         },
  //         approvalState: 'noApprovalRequired',
  //         executionState: 'completed',
  //         result: {
  //           date: '2025-01-21',
  //           tickerSymbol: 'AAPL',
  //           open: 752.455980166495,
  //           close: 755.9934767785387,
  //           volume: 1000000
  //         },
  //         error: null
  //       },
  //       {
  //         id: '774ef820-e228-4d18-bdb1-41f8d5074c60',
  //         request: {
  //           id: 'call_1q8qHwxA01D6FfeOSmXGh0Cq',
  //           function: { name: 'get_weather', arguments: { city: 'Sydney' } }
  //         },
  //         approvalState: 'noApprovalRequired',
  //         executionState: 'completed',
  //         result: { city: 'Sydney', temperature: 25, condition: 'Sunny' },
  //         error: null
  //       }
  //     ],
  //     createdAt: 1737504819304
  //   }
  // ]
};

void main();
