#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    groq: { apiKey: process.env.GROQ_API_KEY },
  });

  // Optional: Set default model
  jorEl.models.setDefault("llama-3.1-8b-instant");

  // Optional: Set system message
  jorEl.systemMessage = "Format everything you see as a JSON object. Make sure to use snake_case for attributes!";

  // Will return a JSON object
  const response = await jorEl.json("Format this as JSON: Name = John, Current Age = 30, City = Sydney");

  console.log(response);
  // { name: 'John', current_age: 30, city: 'Sydney' }
};

void main();
