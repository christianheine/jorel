#!/usr/bin/env ts-node

import { config } from "dotenv";
import { z } from "zod";
import { JorEl } from "../../../src";
import { getStockValue } from "../../_utilities/get-stock-value";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ mistral: true });

  // Register a model
  jorEl.providers.mistral.addModel("mistral-medium-latest");

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
  // The current stock price for Apple (AAPL) is $233.22.

  console.log(meta);
  // {
  //   model: 'mistral-large-latest',
  //   provider: 'mistral',
  //   temperature: 0,
  //   durationMs: 874,
  //   inputTokens: 181,
  //   outputTokens: 20
  // }

  console.dir(messages, { depth: null });
  // [
  //   {
  //     id: '15927912-9863-4005-a950-28da63dc1e24',
  //     role: 'system',
  //     content: 'You are a helpful assistant.',
  //     createdAt: 1738919835344
  //   },
  //   {
  //     id: '2254bd4d-d02a-4093-99ff-accbe71241d8',
  //     role: 'user',
  //     content: 'What is the current stock price for Apple?',
  //     createdAt: 1738919835344
  //   },
  //   {
  //     id: '82034944-5da6-4c54-8234-61a681babd80',
  //     role: 'assistant_with_tools',
  //     content: null,
  //     toolCalls: [
  //       {
  //         id: '476a69f6-3120-4b03-95c5-6beea8a9be0d',
  //         request: {
  //           id: 'QppL6QxRJ',
  //           function: {
  //             name: 'get_stock_data',
  //             arguments: { tickerSymbol: 'AAPL' }
  //           }
  //         },
  //         approvalState: 'noApprovalRequired',
  //         executionState: 'completed',
  //         result: {
  //           symbol: 'AAPL',
  //           open: 231.285,
  //           close: 233.22,
  //           volume: 28421367
  //         },
  //         error: null
  //       }
  //     ],
  //     createdAt: 1738919837374
  //   }
  // ]
};

void main();
