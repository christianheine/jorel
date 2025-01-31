#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl, LlmToolKit } from "../../src";
import { getStockValue } from "../_utilities/get-stock-value";
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
  ]);

  const { response, meta, messages } = await jorEl.ask(
    "What is the current stock price for Apple?",
    { tools },
    true);

  console.log(response);
  // The current stock price for Apple (AAPL) is $445.23.

  console.log(meta);
  // {
  //   model: 'gpt-4o-mini',
  //   provider: 'openai',
  //   temperature: undefined,
  //   durationMs: 1804,
  //   inputTokens: 134,
  //   outputTokens: 18
  // }

  console.dir(messages, { depth: null });
  // [
  //   {
  //     id: '827d5c2a-cce4-4f67-916d-51232e139a7a',
  //     role: 'system',
  //     content: 'You are a helpful assistant.',
  //     createdAt: 1738361692615
  //   },
  //   {
  //     id: 'd8a55c59-7371-44a8-8add-d5e528e83a1b',
  //     role: 'user',
  //     content: 'What is the current stock price for Apple?',
  //     createdAt: 1738361692615
  //   },
  //   {
  //     id: '339350fb-ccea-40dd-9837-b6f346b016ae',
  //     role: 'assistant_with_tools',
  //     content: null,
  //     toolCalls: [
  //       {
  //         id: '62c5434e-1c12-4904-a0a2-cb196cbe33bc',
  //         request: {
  //           id: 'call_QCsco1QYILSpazNcUWVykYAr',
  //           function: {
  //             name: 'get_stock_data',
  //             arguments: { tickerSymbol: 'AAPL' }
  //           }
  //         },
  //         approvalState: 'noApprovalRequired',
  //         executionState: 'completed',
  //         result: {
  //           date: '2025-01-30',
  //           tickerSymbol: 'AAPL',
  //           open: 436.21986165374426,
  //           close: 445.2300153342376,
  //           volume: 1000000
  //         },
  //         error: null
  //       }
  //     ],
  //     createdAt: 1738361693962
  //   }
  // ]
};

void main();
