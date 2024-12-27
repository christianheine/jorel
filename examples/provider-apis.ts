#!/usr/bin/env ts-node

import {config} from "dotenv";
import {AnthropicProvider, OpenAIProvider} from "../src";

config();

const main = async () => {
  const anthropic = new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  const anthropicModels = await anthropic.getAvailableModels();

  console.log(anthropicModels);

  const anthropicResponse = await anthropic.generateResponse("claude-3-5-haiku-20241022", [{
    role: "user",
    content: "What is the capital of France?"
  }], {
    temperature: 0.1
  });

  console.log(anthropicResponse.content);

  const openAi = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY
  });

  const openAiModels = await openAi.getAvailableModels();

  console.log(openAiModels);

  const openAiResponse = await openAi.generateResponse("gpt-4o-mini", [{
    role: "user",
    content: "What is the capital of France?"
  }], {
    temperature: 0.1
  });

  console.log(openAiResponse.content);
};

void main();