#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance with pre-initialized Mistral provider (and default models)
  const jorEl = new JorEl({ mistral: true }); // Uses process.env.MISTRAL_API_KEY

  jorEl.systemMessage = "Format everything you see as a JSON object. Make sure to use snake_case for attributes!";

  // Will return a JSON object
  const response = await jorEl.json("Format this: Name = John, Current Age = 30, City = Sydney");

  console.log(response);
  // { name: 'John', current_age: 30, city: 'Sydney' }
};

void main();
