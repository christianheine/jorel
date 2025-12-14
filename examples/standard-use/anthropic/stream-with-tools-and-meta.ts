#!/usr/bin/env ts-node

import { config } from "dotenv";
import { z } from "zod";
import { JorEl } from "../../../src";
import { getWeather } from "../../_utilities/get-weather";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ anthropic: true });

  // Register a model
  jorEl.providers.anthropic.addModel("claude-haiku-4-5");

  // Will return a stream of chunks, and a response and messages object
  const stream = jorEl.streamWithMeta("What is the weather in Sydney?", {
    tools: [
      {
        name: "get_weather",
        description: "Get the current temperature and conditions for a city",
        executor: getWeather,
        params: z.object({ city: z.string() }),
      },
    ],
    reasoningEffort: "medium",
    // streamBuffer: { disabled: true },
  });

  // Print each chunk
  for await (const chunk of stream) {
    process.stdout.write(JSON.stringify(chunk, null, 2));
    process.stdout.write("\n");
  }

  /*

  Returns:

  {
    "type": "messageStart",
    "messageId": "019a6a96-318e-70da-ba17-b1c23581180e"
  }
  {
    "type": "reasoningChunk",
    "content": "The user is asking for",
    "chunkId": "019a6a96-3be3-710e-b112-101f6bf5bdbb",
    "messageId": "019a6a96-318e-70da-ba17-b1c23581180e"
  }
  {
    "type": "reasoningChunk",
    "content": " the weather in Sydney. I have a",
    "chunkId": "019a6a96-3be4-73a9-bed6-6db9dee979b0",
    "messageId": "019a6a96-318e-70da-ba17-b1c23581180e"
  }
  {
    "type": "reasoningChunk",
    "content": " function called `",
    "chunkId": "019a6a96-3be4-73a9-bed6-7277a0e28f7a",
    "messageId": "019a6a96-318e-70da-ba17-b1c23581180e"
  }
  {
    "type": "reasoningChunk",
    "content": "get_weather` that takes",
    "chunkId": "019a6a96-3be4-73a9-bed6-76ce2f35e093",
    "messageId": "019a6a96-318e-70da-ba17-b1c23581180e"
  }
  {
    "type": "reasoningChunk",
    "content": " a city name",
    "chunkId": "019a6a96-3be4-73a9-bed6-78e438bce8d5",
    "messageId": "019a6a96-318e-70da-ba17-b1c23581180e"
  }
  {
    "type": "reasoningChunk",
    "content": " as a parameter. I",
    "chunkId": "019a6a96-3be5-74ec-b4b4-f059a86c4fa5",
    "messageId": "019a6a96-318e-70da-ba17-b1c23581180e"
  }
  {
    "type": "reasoningChunk",
    "content": " should call this function with \"",
    "chunkId": "019a6a96-3be5-74ec-b4b4-f6673adf28ff",
    "messageId": "019a6a96-318e-70da-ba17-b1c23581180e"
  }
  {
    "type": "reasoningChunk",
    "content": "Sydney\" as the city parameter",
    "chunkId": "019a6a96-3be5-74ec-b4b4-f894d4778922",
    "messageId": "019a6a96-318e-70da-ba17-b1c23581180e"
  }
  {
    "type": "reasoningChunk",
    "content": " to get the current weather information",
    "chunkId": "019a6a96-3be5-74ec-b4b4-ffd317cbc5df",
    "messageId": "019a6a96-318e-70da-ba17-b1c23581180e"
  }
  {
    "type": "reasoningChunk",
    "content": ".",
    "chunkId": "019a6a96-3be5-74ec-b4b5-03aab994a517",
    "messageId": "019a6a96-318e-70da-ba17-b1c23581180e"
  }
  {
    "type": "toolCallStarted",
    "toolCall": {
      "id": "...",
      "executionState": "pending",
      "approvalState": "noApprovalRequired",
      "request": {
        "id": "...",
        "function": {
          "name": "get_weather",
          "arguments": {
            "city": "Sydney"
          }
        }
      },
      "result": null
    }
  }
  {
    "type": "toolCallCompleted",
    "toolCall": {
      "id": "...",
      "request": {
        "id": "...",
        "function": {
          "name": "get_weather",
          "arguments": {
            "city": "Sydney"
          }
        }
      },
      "approvalState": "noApprovalRequired",
      "executionState": "completed",
      "result": {
        "city": "Sydney",
        "temperature": 25,
        "condition": "Sunny"
      },
      "error": null
    }
  }
  {
    "type": "messageEnd",
    "messageId": "019a6a96-318e-70da-ba17-b1c23581180e",
    "message": {
      "id": "019a6a96-318e-70da-ba17-b1c23581180e",
      "role": "assistant_with_tools",
      "content": null,
      "toolCalls": [
        {
          "id": "...",
          "request": {
            "id": "...",
            "function": {
              "name": "get_weather",
              "arguments": {
                "city": "Sydney"
              }
            }
          },
          "approvalState": "noApprovalRequired",
          "executionState": "completed",
          "result": {
            "city": "Sydney",
            "temperature": 25,
            "condition": "Sunny"
          },
          "error": null
        }
      ],
      "reasoningContent": "The user is asking for the weather in Sydney. I have a function called `get_weather` that takes a city name as a parameter. I should call this function with \"Sydney\" as the city parameter to get the current weather information.",
      "createdAt": ...
    }
  }
  {
    "type": "messageStart",
    "messageId": "019a6a96-3c93-71ae-93b5-55c9346707a0"
  }
  {
    "type": "chunk",
    "content": "The",
    "chunkId": "019a6a96-3f11-74fc-b2c2-3a7ed39b8e77",
    "messageId": "019a6a96-3c93-71ae-93b5-55c9346707a0"
  }
  {
    "type": "chunk",
    "content": " weather in Sydney is currently **",
    "chunkId": "019a6a96-40a6-77ae-9360-504c821b1d66",
    "messageId": "019a6a96-3c93-71ae-93b5-55c9346707a0"
  }
  {
    "type": "chunk",
    "content": "Sunny** with a temperature of **",
    "chunkId": "019a6a96-40a6-77ae-9360-549c83a0e01c",
    "messageId": "019a6a96-3c93-71ae-93b5-55c9346707a0"
  }
  {
    "type": "chunk",
    "content": "25°C** (77°F",
    "chunkId": "019a6a96-40ab-74c3-92d7-f82c760635f7",
    "messageId": "019a6a96-3c93-71ae-93b5-55c9346707a0"
  }
  {
    "type": "chunk",
    "content": "). It's a beautiful day",
    "chunkId": "019a6a96-40ab-74c3-92d7-fd51a5460a4a",
    "messageId": "019a6a96-3c93-71ae-93b5-55c9346707a0"
  }
  {
    "type": "chunk",
    "content": "!",
    "chunkId": "019a6a96-40ab-74c3-92d8-02829d700587",
    "messageId": "019a6a96-3c93-71ae-93b5-55c9346707a0"
  }
  {
    "type": "messageEnd",
    "messageId": "019a6a96-3c93-71ae-93b5-55c9346707a0",
    "message": {
      "id": "019a6a96-3c93-71ae-93b5-55c9346707a0",
      "role": "assistant",
      "content": "The weather in Sydney is currently **Sunny** with a temperature of **25°C** (77°F). It's a beautiful day!",
      "reasoningContent": "",
      "createdAt": ...
    }
  }
  {
    "type": "response",
    "role": "assistant",
    "content": "The weather in Sydney is currently **Sunny** with a temperature of **25°C** (77°F). It's a beautiful day!",
    "reasoningContent": "",
    "meta": {
      "model": "anthropic/claude-haiku-4.5",
      "provider": "open-router",
      "temperature": 0,
      "durationMs": 3870,
      "inputTokens": 1257,
      "outputTokens": 144,
      "reasoningTokens": 0,
      "generations": [
        {
          "model": "anthropic/claude-haiku-4.5",
          "provider": "open-router",
          "temperature": 0,
          "durationMs": 2819,
          "inputTokens": 603,
          "outputTokens": 111,
          "hadToolCalls": true,
          "timestamp": ...
        },
        {
          "model": "anthropic/claude-haiku-4.5",
          "provider": "open-router",
          "temperature": 0,
          "durationMs": 1051,
          "inputTokens": 654,
          "outputTokens": 33,
          "hadToolCalls": false,
          "timestamp": ...
        }
      ]
    }
  }
  {
    "type": "messages",
    "messages": [
      {
        "id": "019a6a96-318d-739a-af29-e7c468c6b906",
        "role": "system",
        "content": "You are a helpful assistant.",
        "createdAt": ...
      },
      {
        "id": "019a6a96-318c-7288-b8d6-8800bf3ed81b",
        "role": "user",
        "createdAt": ...,
        "content": [
          {
            "type": "text",
            "text": "What is the weather in Sydney?"
          }
        ]
      },
      {
        "id": "019a6a96-318e-70da-ba17-b1c23581180e",
        "role": "assistant_with_tools",
        "content": null,
        "toolCalls": [
          {
            "id": "...",
            "request": {
              "id": "...,
              "function": {
                "name": "get_weather",
                "arguments": {
                  "city": "Sydney"
                }
              }
            },
            "approvalState": "noApprovalRequired",
            "executionState": "completed",
            "result": {
              "city": "Sydney",
              "temperature": 25,
              "condition": "Sunny"
            },
            "error": null
          }
        ],
        "reasoningContent": "The user is asking for the weather in Sydney. I have a function called `get_weather` that takes a city name as a parameter. I should call this function with \"Sydney\" as the city parameter to get the current weather information.",
        "createdAt": ...
      },
      {
        "id": "019a6a96-3c93-71ae-93b5-55c9346707a0",
        "role": "assistant",
        "content": "The weather in Sydney is currently **Sunny** with a temperature of **25°C** (77°F). It's a beautiful day!",
        "reasoningContent": "",
        "createdAt": ...
      }
    ],
    "stopReason": "completed"
  }

*/
};

void main();
