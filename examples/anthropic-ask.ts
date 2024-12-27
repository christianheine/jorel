#!/usr/bin/env ts-node

import {config} from "dotenv";
import {JorEl} from "../src";

config();

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    anthropic: {apiKey: process.env.ANTHROPIC_API_KEY},
  });

  // Will return a string
  const response = await jorEl.ask("What is the capital of France?");

  console.log(response);
};

void main();