#!/usr/bin/env ts-node

import {config} from "dotenv";
import {AnthropicProvider, GoogleVertexAiProvider, GrokProvider, GroqProvider, ImageContent, OllamaProvider, OpenAIProvider} from "../src";

config();

const openAiExample = async () => {
  const openAi = new OpenAIProvider();

  const image = await ImageContent.fromFile("./image.png");

  const response = await openAi.generateResponse("gpt-4o-mini", [{
    role: "user",
    content: ["What is in this image?", image]
  }], {
    temperature: 0.1
  });

  console.log(response);
};

const ollamaExample = async () => {
  const ollama = new OllamaProvider();

  const image = await ImageContent.fromFile("./image.png");

  const response = await ollama.generateResponse("llama3.2-vision", [{
    role: "user",
    content: ["What is in this image? In 10 words or less.", image]
  }], {
    temperature: 0.1
  });

  console.log(response);
};

const vertexAiExample = async () => {
  const vertexAi = new GoogleVertexAiProvider();

  const image = await ImageContent.fromFile("./image.png");

  const response = await vertexAi.generateResponse("gemini-1.5-flash-001", [
    {role: "system", content: "You are an expert in image recognition. You answer succinctly, but informatively."},
    {
      role: "user",
      content: ["What is in this image?", image]
    }], {
    temperature: 0.1,
  });

  console.log(response);
};

const groqExample = async () => {
  const groq = new GroqProvider();

  const image = await ImageContent.fromFile("./image.png");

  const response = await groq.generateResponse("llama-3.2-11b-vision-preview", [{
    role: "user",
    content: ["What is in this image?", image]
  }], {
    temperature: 0.1
  });

  console.log(response);
};

const grokExample = async () => {
  const grok = new GrokProvider();

  const image = await ImageContent.fromFile("./image.png");

  const response = await grok.generateResponse("grok-2-vision-1212", [{
    role: "user",
    content: ["What is in this image?", image]
  }], {
    temperature: 0.1
  });

  console.log(response);
};

const anthropicExample = async () => {
  const anthropic = new AnthropicProvider();

  const image = await ImageContent.fromFile("./image.png");

  const response = await anthropic.generateResponse("claude-3-5-sonnet-20241022", [{
    role: "user",
    content: ["What is in this image?", image]
  }], {
    temperature: 0.1
  });

  console.log(response);
};

const main = async () => {
  await anthropicExample();
  await grokExample();
  await groqExample();
  await ollamaExample();
  await openAiExample();
  await vertexAiExample();
};

void main();
