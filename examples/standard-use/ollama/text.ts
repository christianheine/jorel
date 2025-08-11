#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl();

  jorEl.providers.registerOllama();

  jorEl.systemMessage = "You are a helpful assistant";

  jorEl.models.register({ model: "deepseek-r1:8b", provider: "ollama" });

  // Will return a string
  const response = await jorEl.text("Write a basic webserver in Typescript (using Hono)", {
    model: "deepseek-r1:8b",
  });

  console.log(response);
};

void main();
