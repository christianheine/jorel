#!/usr/bin/env ts-node

import {config} from "dotenv";
import {JorEl} from "../src";

config();

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    vertexAi: {location: process.env.GCP_LOCATION, project: process.env.GCP_PROJECT, keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS},
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