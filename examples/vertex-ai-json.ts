#!/usr/bin/env ts-node

import {config} from "dotenv";
import {JorEl} from "../src";

config();

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    vertexAi: {location: process.env.GCP_LOCATION, project: process.env.GCP_PROJECT, keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS},
  });

  // Optional: Set system message
  jorEl.systemMessage = "Format everything you see as a JSON object. Make sure to use snakeCase for attributes!";

  // Will return a JSON object
  const response = await jorEl.json("Format this: Name = John, Age = 30, City = Sydney");

  console.log(response);
};

void main();