#!/usr/bin/env ts-node

import { config } from "dotenv";
import { AnthropicProvider, generateUserMessage, ImageContent } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  const provider = new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY });

  const models = await provider.getAvailableModels();

  console.log(models);

  const response = await provider.generateResponse(
    "claude-3-5-haiku-20241022",
    [await generateUserMessage("What is the capital of France?")],
    { temperature: 0.1 },
  );

  console.log(response.content, response.meta);

  const image = await ImageContent.fromFile("./image.png");

  const imageResponse = await provider.generateResponse(
    "claude-3-5-sonnet-20241022",
    [{ role: "user", content: [{type: 'text', text: "What is in this image?"}, await image.toMessageContent()] }],
    { temperature: 0.1 },
  );

  console.log(imageResponse.content, imageResponse.meta);

  const stream = provider.generateResponseStream(
    "claude-3-5-haiku-20241022",
    [await generateUserMessage("What is the capital of France?")],
    { temperature: 0.1 },
  );

  for await (const chunk of stream) {
    if (chunk.type === "chunk") {
      process.stdout.write(chunk.content);
    }
    if (chunk.type === "response") {
      console.log(chunk.meta);
    }
  }
};

void main();
