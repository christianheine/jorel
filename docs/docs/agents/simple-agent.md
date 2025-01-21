---
sidebar_position: 2
---

# Creating a Simple Agent

This guide will walk you through creating a simple agent and using it to process tasks. We'll build a weather agent that can provide weather information for different cities.

## Basic Setup

First, let's create a simple agent that can use a weather tool:

```typescript
import { JorEl } from 'jorel';
import { z } from 'zod';

const jorEl = new JorEl({ openAI: true });

// 1. Register the tool at team level
jorEl.team.addTools([{
  name: "get_weather",
  description: "Get the current weather for a city",
  executor: async ({ city }) => ({ 
    temperature: 22, 
    conditions: "sunny" 
  }),
  params: z.object({
    city: z.string(),
  }),
}]);

// 2. Create the agent
const weatherAgent = jorEl.team.addAgent({
  name: "weather_agent",
  description: "Specialist in weather information",
  systemMessageTemplate: 
    "You are a weather specialist. " +
    "Provide detailed weather information when asked.",
  allowedTools: ["get_weather"],
});
```

## Processing Tasks

A task represents a conversation with an agent. It tracks:
* Messages between user and agent
* Tool usage
* Processing state
* Events and statistics

### Creating a Task

```typescript
// Create a task with an initial user message
const task = await jorEl.team.createTask(
  "What's the weather like in Sydney?"
);
```

### Executing a Task

The simplest way to process a task is to execute it to completion:

```typescript
const result = await jorEl.team.executeTask(task, {
  limits: {
    maxIterations: 10,  // Prevent infinite loops
    maxGenerations: 6,  // Limit LLM calls
    maxDelegations: 2,  // Limit agent delegations
  },
});

console.log(result.result);
// The weather in Sydney is sunny with a temperature of 22°C.
```

### Understanding Task Events

Tasks generate events that help you understand what happened during processing:

```typescript
const { events, stats, tokens } = result.eventsWithStatistics;

// Log the sequence of events
for (const event of events) {
  console.log(`${event.eventType}: ${event.action}`);
}

// Example output:
// generation: Agent weather_agent generated assistant_with_tools message
// toolUse: Agent weather_agent used tool get_weather
// generation: Agent weather_agent generated assistant message
```

## Adding Context with Documents

You can provide contextual information to your agent using documents:

```typescript
const weatherAgent = jorEl.team.addAgent({
  name: "weather_agent",
  description: "Specialist in weather information",
  systemMessageTemplate: 
    "You are a weather specialist. Here is some context: {{documents}}",
  allowedTools: ["get_weather"],
  documents: [{
    title: "Temperature Guidelines",
    content: "Always provide temperatures in both Celsius and Fahrenheit."
  }],
});
```

## Customizing Response Format

You can specify that your agent should return JSON responses:

```typescript
const weatherAgent = jorEl.team.addAgent({
  name: "weather_agent",
  description: "Specialist in weather information",
  systemMessageTemplate: 
    "You are a weather specialist. Return all responses as JSON with fields: " +
    "city, temperature_c, temperature_f, conditions",
  allowedTools: ["get_weather"],
  responseType: "json",
});

const task = await jorEl.team.createTask(
  "What's the weather in Sydney?"
);

const result = await jorEl.team.executeTask(task);
console.log(result.result);
// {
//   "city": "Sydney",
//   "temperature_c": 22,
//   "temperature_f": 71.6,
//   "conditions": "sunny"
// }
```

## Step-by-Step Processing

Instead of executing a task to completion, you can process it step by step:

```typescript
// Create the task
const task = await jorEl.team.createTask(
  "What's the weather in Sydney?"
);

// Process one step at a time
let currentTask = task;
while (currentTask.status !== "completed" && currentTask.status !== "halted") {
  // Resume the task for one step
  currentTask = await jorEl.team.resumeTask(currentTask, {
    limits: {
      maxIterations: 10,
      maxGenerations: 6,
    },
  });

  // Check what happened in this step
  const latestEvent = currentTask.events[currentTask.events.length - 1];
  console.log(`Step completed: ${latestEvent.eventType}`);
  
  if (currentTask.status === "halted") {
    console.log(`Task halted: ${currentTask.haltReason}`);
  }
}
```

## Best Practices

1. **Clear System Messages**: Make your agent's role and capabilities clear in the system message

2. **Appropriate Limits**: Always set reasonable limits when executing tasks to prevent:
   - Infinite loops ( `maxIterations` )
   - Excessive costs ( `maxGenerations` )
   - Deep delegation chains ( `maxDelegations` )

3. **Error Handling**: Tasks can halt for various reasons:
   

```typescript
   if (result.status === "halted") {
     switch (result.haltReason) {
       case "maxIterations":
         console.log("Task took too many steps");
         break;
       case "maxGenerations":
         console.log("Task exceeded LLM call limit");
         break;
       case "approvalRequired":
         console.log("Task needs user approval to continue");
         break;
       // ... handle other cases
     }
   }
   ```

4. **Resource Monitoring**: Keep track of token usage with `eventsWithStatistics`
   

```typescript
   const { tokens } = result.eventsWithStatistics;
   console.log("Token usage:", tokens);
   // {
   //   'gpt-4': {
   //     input: 245,
   //     output: 62
   //   }
   // }
   ```

## Next Steps

* Learn about [Task Processing](./task-deep-dive.md) in detail
* Explore [Delegation](./delegation.md) between agents
* Learn about [Transfer](./transfer.md) of control
