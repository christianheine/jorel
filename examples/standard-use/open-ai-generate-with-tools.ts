#!/usr/bin/env ts-node

import { config } from "dotenv";
import { generateUserMessage, JorEl, LlmMessage, LlmToolKit } from "../../src";
import { getWeather } from "../_utilities/get-weather";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAI: true }); // Uses process.env.OPENAI_API_KEY

  const tools = new LlmToolKit([
    {
      name: "get_weather",
      description: "Get the current temperature and conditions for a city",
      executor: getWeather, // Requires a weatherapi.com API key
      params: {
        type: "object",
        properties: {
          city: { type: "string" },
        },
        required: ["city"],
      },
    },
  ]);

  const messages: LlmMessage[] = [generateUserMessage("What is the weather in Sydney?")];

  const toolMessage: LlmMessage = await jorEl.generate(messages, { tools });

  if (toolMessage.role === "assistant") {
    console.log(toolMessage.content);
  } else if (toolMessage.role === "assistant_with_tools") {
    // Use the tool kit to execute each tool call of the last message
    const processedMessage = await tools.processCalls(toolMessage);

    // Generate the final response
    const response = await jorEl.generate([...messages, processedMessage]);

    console.log(response.content);

    console.log(JSON.stringify(processedMessage, null, 2));
  }
};

void main();
