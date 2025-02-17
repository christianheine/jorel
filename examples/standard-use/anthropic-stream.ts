#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ anthropic: true });

  jorEl.systemMessage = "You are a master song writer. When asked for a song, return only the song lyrics.";

  // Will return a stream of strings
  const stream = jorEl.stream("Generate a merry Christmas song. 5 lines max.");

  // Print each chunk
  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }

  process.stdout.write("\n");
};

void main();
