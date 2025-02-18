#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";
import { getStockValue } from "../_utilities/get-stock-value";
import { z } from "zod";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ anthropic: true });

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
  // Based on the previous day's stock data for Apple (AAPL):
  // - Closing Price: $244.60
  // - Opening Price: $241.25
  // - Trading Volume: 38,900,219 shares
  //
  // Please note that this is the closing price from the most recent trading day, and stock prices can fluctuate.
  // For the most up-to-the-minute pricing, I recommend checking a real-time financial platform or your preferred stock tracking service.

  console.log(meta);
  // {
  //   model: 'claude-3-5-haiku-20241022',
  //   provider: 'anthropic',
  //   temperature: 0,
  //   durationMs: 3318,
  //   inputTokens: 458,
  //   outputTokens: 104
  // }

  console.dir(messages, { depth: null });
  // [
  //   {
  //     id: 'ede3a975-3904-4bc8-83a0-568a1d4d677c',
  //     role: 'system',
  //     content: 'You are a helpful assistant.',
  //     createdAt: 1739872258748
  //   },
  //   {
  //     id: '813f6e1d-456b-49ba-98c9-5341be19670b',
  //     role: 'user',
  //     createdAt: 1739872258748,
  //     content: [
  //       {
  //         type: 'text',
  //         text: 'What is the current stock price for Apple?'
  //       }
  //     ]
  //   },
  //   {
  //     id: '3b176d11-75bd-4c27-a48f-cf564d81c0c9',
  //     role: 'assistant_with_tools',
  //     content: "I'll help you retrieve the stock data for Apple (ticker symbol AAPL).",
  //     toolCalls: [
  //       {
  //         id: 'edd12721-316f-48ff-ac8d-0d7e0c196f40',
  //         request: {
  //           id: 'toolu_01QpLpfJfbQ3MwpbNobQBm8N',
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
  //     createdAt: 1739872261582
  //   },
  //   {
  //     id: '0e26222c-2124-494f-810e-d3826859d454',
  //     role: 'assistant',
  //     content: "Based on the previous day's stock data for Apple (AAPL):\n" +
  //       '- Closing Price: $244.60\n' +
  //       '- Opening Price: $241.25\n' +
  //       '- Trading Volume: 38,900,219 shares\n' +
  //       '\n' +
  //       'Please note that this is the closing price from the most recent trading day, and stock prices can fluctuate. For the most up-to-the-minute pricing, I recommend checking a real-time financial platform or your preferred stock tracking service.',
  //     createdAt: 1739872264901
  //   }
  // ]
};

void main();
