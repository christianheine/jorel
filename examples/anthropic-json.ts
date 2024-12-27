#!/usr/bin/env ts-node

import {config} from "dotenv";
import {JorEl} from "../src";

config();

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    anthropic: {apiKey: process.env.ANTHROPIC_API_KEY},
  });

  // Optional: Set system message
  jorEl.systemMessage = "Format everything you see as a JSON object. Make sure to use snakeCase for attributes!";

  // Will return a JSON object
  const response = await jorEl.json("Format this: Name = John, Age = 30, City = Sydney");

  console.log(response);
};

void main();