#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";
import { getWeather } from "../_utilities/get-weather";
import { z } from "zod";

config({ path: "../../.env" });

const main = async () => {
  const jorEl = new JorEl({
    openAI: true,
    logger: "console",
    logLevel: "debug",
  });

  jorEl.team.addTools([
    {
      name: "get_weather",
      description: "Get the current temperature and conditions for a city",
      executor: getWeather,
      params: z.object({ city: z.string() }),
    },
  ]);

  jorEl.team.addAgent({
    name: "weather_agent",
    description: "Can provide weather information for a given location.",
    systemMessageTemplate:
      "You are a helpful assistant. You can provide weather information for a given location. Return JSON (user, city, temperature, conditions, time). Here is some additional context: {{documents}}",
    allowedTools: ["get_weather"],
    documents: [
      { content: "The current location is Sydney", title: "Location Info" },
      { content: "The name of the user is Christian", title: "User Profile" },
      { content: `The current time is ${new Date().toLocaleTimeString()}`, title: "Time Info" },
    ],
    responseType: "json",
    // model: "gpt4o-mini", // Optional, if no model is provided, the default model of JorEl is used
  });

  const task = await jorEl.team.createTask("Hi. What is the current time and weather?");

  const executedTask = await jorEl.team.executeTask(task, {
    limits: {
      maxIterations: 10, // Prevents infinite loops
      maxGenerations: 6, // Maximum number of LLM generations (e.g. to control cost)
      maxDelegations: 2,
    },
  });

  const { events, stats, tokens } = executedTask.eventsWithStatistics;

  console.log("\nEvents:");
  for (const event of events) {
    console.log(`- ${event.eventType}: ${event.action}`);
  }

  console.log("\nStatistics:");
  console.log({ stats, tokens });

  console.log("\nResult:");
  console.log(executedTask.result);

  // Result:
  // {
  //   "user": "Christian",
  //   "city": "Sydney",
  //   "temperature": 20.4,
  //   "conditions": "Patchy rain nearby",
  //   "time": "10:54:31 AM"
  // }
};

void main();
