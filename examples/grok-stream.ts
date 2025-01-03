#!/usr/bin/env ts-node

import {config} from "dotenv";
import {JorEl} from "../src";

config();

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    grok: {apiKey: process.env.GROK_API_KEY},
  });

  // Will return a stream of strings
  const stream = jorEl.stream("Generate a merry Christmas song. 5 lines max.");

  // Print each chunk
  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }

  process.stdout.write("\n");
};

void main();