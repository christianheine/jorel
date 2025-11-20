#!/usr/bin/env ts-node

import { config } from "dotenv";
import { z } from "zod";
import { JorEl } from "../../../src";
import { getStockValue } from "../../_utilities/get-stock-value";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ googleGenAi: true });

  jorEl.models.setDefault("gemini-3-pro-preview");

  // Generate a response with tools
  const { response, meta, messages } = await jorEl.text(
    "What is the current stock price for Apple?",
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
  // The current stock price for Apple (AAPL) is $237.59.

  console.log(meta);
  // {
  //   model: 'gpt-4o-mini',
  //   provider: 'openai',
  //   temperature: 0,
  //   durationMs: 962,
  //   inputTokens: 125,
  //   outputTokens: 18
  // }

  console.dir(messages, { depth: null });
  // [
  //   {
  //     id: '698d590f-a791-4235-a10a-d94265c381b8',
  //     role: 'system',
  //     content: 'You are a helpful assistant.',
  //     createdAt: 1738366791021
  //   },
  //   {
  //     id: 'd3c7cef4-3945-4b70-9ec6-07d4d89b62fc',
  //     role: 'user',
  //     content: 'What is the current stock price for Apple?',
  //     createdAt: 1738366791021
  //   },
  //   {
  //     id: 'b24bb898-10c7-49e6-9ed4-23bd81181a68',
  //     role: 'assistant_with_tools',
  //     content: null,
  //     toolCalls: [
  //       {
  //         id: '5e473d40-8ed7-4dd5-8cdb-e69f22cf9d5f',
  //         request: {
  //           id: 'call_SbnVmztcNvjMIox749NjOY2w',
  //           function: {
  //             name: 'get_stock_data',
  //             arguments: { tickerSymbol: 'AAPL' }
  //           }
  //         },
  //         approvalState: 'noApprovalRequired',
  //         executionState: 'completed',
  //         result: {
  //           symbol: 'AAPL',
  //           open: 238.665,
  //           close: 237.59,
  //           volume: 53505269
  //         },
  //         error: null
  //       }
  //     ],
  //     createdAt: 1738366793417
  //   }
  // ]
};

void main();
