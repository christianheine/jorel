#!/usr/bin/env ts-node

import {config} from "dotenv";
import {JorEl} from "../src";

config();

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    vertexAi: {location: process.env.GCP_LOCATION, project: process.env.GCP_PROJECT, keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS},
  });

  // Will return a string
  const response = await jorEl.ask("What is the capital of France?");

  console.log(response);
};

void main();