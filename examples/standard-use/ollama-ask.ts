#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl();

  jorEl.providers.registerOllama({ defaultTemperature: 0.2 });

  jorEl.systemMessage = "You are a helpful assistant";

  jorEl.models.register({model: "deepseek-r1:8b", provider: "ollama"})

  // Will return a string
  const response = await jorEl.ask("Write a basic webserver in Typescript (using Hono)", {
    model: "deepseek-r1:8b"
  });

  console.log(response);
};

void main();
