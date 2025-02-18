#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";
import { getStockValue } from "../_utilities/get-stock-value";
import { z } from "zod";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ vertexAi: true });

  // Generate a response with tools
  const { response, meta, messages } = await jorEl.text(
    "What is the current stock price for Apple (AAPL)?",
    {
      tools: [
        {
          name: "get_stock_data",
          description: "Get stock data for a given ticker symbol (previous day)",
          executor: getStockValue,
          params: z.object({ tickerSymbol: z.string() }),
        },
      ],
    },
    true,
  );

  console.log(response);
  // The current stock price for Apple (AAPL) is $244.6.

  console.log(meta);
  // {
  //   model: 'gemini-2.0-flash-001',
  //   provider: 'google-vertex-ai',
  //   temperature: 0,
  //   durationMs: 613,
  //   inputTokens: 59,
  //   outputTokens: 18
  // }

  console.dir(messages, { depth: null });
  // [
  //   {
  //     id: '7098a514-ba44-429e-8ac7-e2070ed3e4bf',
  //     role: 'system',
  //     content: 'You are a helpful assistant.',
  //     createdAt: 1739872376844
  //   },
  //   {
  //     id: '10040c20-aa35-47c9-881c-034a9da19f89',
  //     role: 'user',
  //     createdAt: 1739872376844,
  //     content: [
  //       {
  //         type: 'text',
  //         text: 'What is the current stock price for Apple (AAPL)?'
  //       }
  //     ]
  //   },
  //   {
  //     id: '3bf99ddb-73f9-4834-967e-0f93828eb175',
  //     role: 'assistant_with_tools',
  //     content: null,
  //     toolCalls: [
  //       {
  //         id: 'f9a4b6b0-1fa6-4d9a-8248-f32bfa5031aa',
  //         request: {
  //           id: '5sj48okm',
  //           function: {
  //             name: 'get_stock_data',
  //             arguments: { tickerSymbol: 'AAPL' }
  //           }
  //         },
  //         approvalState: 'noApprovalRequired',
  //         executionState: 'completed',
  //         result: {
  //           symbol: 'AAPL',
  //           open: 241.25,
  //           close: 244.6,
  //           volume: 38900219
  //         },
  //         error: null
  //       }
  //     ],
  //     createdAt: 1739872379865
  //   },
  //   {
  //     id: '0c0f4a45-33c1-475d-a5ce-6b1dbb920de6',
  //     role: 'assistant',
  //     content: 'The current stock price for Apple (AAPL) is $244.6.',
  //     createdAt: 1739872380478
  //   }
  // ]
};

void main();
