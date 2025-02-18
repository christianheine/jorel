#!/usr/bin/env ts-node

import { config } from "dotenv";
import {
  AnthropicProvider,
  GoogleVertexAiProvider,
  GrokProvider,
  GroqProvider,
  LlmToolKit,
  OllamaProvider,
  OpenAIProvider,
} from "../../src";
import { getWeather } from "../_utilities/get-weather";
import { log } from "../_utilities/log";

config({ path: "../../.env" });

/**
 * Example of using providers with tools
 *
 * This example demonstrates how to
 * - Prepare tools
 * - Process the tool calls
 * - Generate a final response with the processed tool calls
 *
 * The example uses a simple tool that fetches the current weather for a city, but the same principles apply to more complex tools.
 *
 */
const main = async () => {
  const providerOptions = {
    openAi: {
      provider: new OpenAIProvider(),
      model: "gpt-4o-mini",
    },
    groq: {
      provider: new GroqProvider(),
      model: "llama-3.3-70b-versatile",
    },
    grok: {
      provider: new GrokProvider(),
      model: "grok-2-1212",
    },
    vertexAi: {
      provider: new GoogleVertexAiProvider(),
      model: "gemini-1.5-flash-001",
    },
    anthropic: {
      provider: new AnthropicProvider(),
      model: "claude-3-5-haiku-20241022",
    },
    ollama: {
      provider: new OllamaProvider(),
      model: "llama3.2",
    },
  };

  const { provider, model } = providerOptions.vertexAi;

  // Create a toolkit with a single tool. You can also add multiple tools here, or use pre-instantiated LlmTool instances.
  const tools = new LlmToolKit([
    {
      name: "get_weather",
      description: "Get the current temperature and conditions for a city",
      executor: getWeather, // Requires a Weather API key
      params: {
        type: "object",
        properties: {
          city: { type: "string" },
        },
        required: ["city"],
      },
    },
  ]);

  let response = await provider.generateResponse(
    model,
    [
      {
        role: "user",
        content: [{ type: "text", text: "What's the current temperature in Sydney?" }],
      },
    ],
    {
      tools,
    },
  );

  if (response.role === "assistant") {
    log("No tool use required", response.content);
  } else if (response.role === "assistant_with_tools") {
    log("Unprocessed tool calls", response.toolCalls);

    // Unprocessed tool calls: [
    //   {
    //     "request": {
    //       "id": "ek3qw9nx",
    //       "function": {
    //         "name": "get_weather",
    //         "arguments": {
    //           "city": "Sydney"
    //         }
    //       }
    //     },
    //     "approvalState": "noApprovalRequired",
    //     "executionState": "pending",
    //     "result": null,
    //     "error": null
    //   }
    // ]

    // If the tool calls require approval, you can approve or reject them using the toolkit
    response = tools.approveCalls(response); // Approve all tool calls

    // response = tools.approveCalls(response, idsToApprove); // Approve specific tool calls
    // response = tools.rejectCalls(response); // Reject all tool calls
    // response = tools.rejectCalls(response, idsToReject); // Reject specific tool calls

    response = await tools.processCalls(response);

    log("Completed tool calls", response.toolCalls);

    // Completed tool calls: [
    //   {
    //     "request": {
    //       "id": "ek3qw9nx",
    //       "function": {
    //         "name": "get_weather",
    //         "arguments": {
    //           "city": "Sydney"
    //         }
    //       }
    //     },
    //     "approvalState": "noApprovalRequired",
    //     "executionState": "completed",
    //     "result": {
    //       "temperature": 24,
    //       "conditions": "overcast"
    //     },
    //     "error": null
    //   }
    // ]

    const followUpResponse = await provider.generateResponse(
      model,
      [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What's the current temperature in Sydney?",
            },
          ],
        },
        response,
      ],
      {
        tools, // Technically not needed here, but included for completeness
      },
    );

    log("Final response with completed tool calls", followUpResponse.content);

    // Final response with completed tool calls: "The current temperature in Sydney is 24°C, and the conditions are overcast."
  }
};

void main();
