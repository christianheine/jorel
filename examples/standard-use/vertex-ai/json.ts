#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ vertexAi: true });

  // Register a model
  jorEl.providers.vertexAi.addModel("gemini-2.5-flash");

  // Optional: Set system message
  jorEl.systemMessage = "Format everything you see as a JSON object. Make sure to use snake_case for attributes!";

  // Will return a JSON object
  const response = await jorEl.json("Format this: Name = John, Current Age = 30, City = Sydney");

  console.log(response);
  // { name: 'John', current_age: 30, city: 'Sydney' }
};

void main();
