#!/usr/bin/env ts-node

import { config } from "dotenv";
import * as readline from "readline";
import { generateUserMessage, JorEl, LlmMessage, LlmToolKit } from "../../../src";
import { getWeather } from "../../_utilities/get-weather";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create a JorEl instance
  const jorEl = new JorEl({ openAI: true });

  // Create a toolkit with our getWeather tool
  const tools = new LlmToolKit([
    {
      name: "get_weather",
      description: "Get the current temperature and conditions for a city",
      executor: getWeather,
      params: {
        type: "object",
        properties: {
          city: { type: "string" },
        },
        required: ["city"],
      },
    },
  ]);

  const messages: LlmMessage[] = [];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const maxAttempts = 3;

  const askQuestion = () => {
    rl.question("> ", async (userInput: string) => {
      if (userInput.toLowerCase() === "exit") {
        console.log("Exiting...");
        rl.close();
        return;
      }

      messages.push(await generateUserMessage(userInput));

      try {
        let message: LlmMessage;

        let attempts = 0;
        do {
          attempts++;
          // Generates the message that may or may not contain a tool request
          message = await jorEl.generate(messages, { tools });

          if (message.role === "assistant_with_tools") {
            message = await tools.processCalls(message);
            console.log(message.content || "Processing...");
            messages.push(message);
          }
          if (attempts >= maxAttempts) {
            break;
          }
        } while (message.role === "assistant_with_tools");

        if (message.role === "assistant_with_tools") {
          console.log("Failed to process the message after 3 attempts");
        } else {
          console.log(message.content);
        }
      } catch (error) {
        console.error("Error:", error);
      }

      askQuestion();
    });
  };

  // Start the REPL
  askQuestion();
};

void main();
