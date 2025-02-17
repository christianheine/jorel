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

  const mainAgent = jorEl.team.addAgent({
    name: "main_agent",
    description: "Main agent who receives initial user messages.",
    systemMessageTemplate:
      "You are a helpful assistant. You try to answer the user's questions to the best of your ability. If you can't, you can transfer the conversation to another agent. These agents are available to you: {{delegates}}",
  });

  const weatherAgent = mainAgent.addDelegate(
    {
      name: "weather_agent",
      description: "Can provide weather information for a given location.",
      systemMessageTemplate: "You are a weather agent. You can provide weather information for a given location.",
      allowedTools: ["get_weather"],
    },
    "transfer",
  );

  weatherAgent.addDelegate(mainAgent, "transfer");

  const task = await jorEl.team.createTask("What is the weather in Sydney?", {});

  const executedTask = await jorEl.team.executeTask(task, {
    limits: {
      maxIterations: 10,
      maxGenerations: 6,
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
};

void main();
