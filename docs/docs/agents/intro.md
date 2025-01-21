---
sidebar_position: 1
---

# Introduction to Agents

JorEl's agent system allows you to create sophisticated interactions between multiple AI agents, enabling complex task processing, delegation, and transfer of control. This powerful feature helps break down complex tasks into manageable pieces and route them to specialized agents.

## Quick Example

Here's a simple example showing how agents can work together to process a task:

Start by creating a JorEl instance:

```typescript
import { JorEl } from 'jorel';
import { z } from 'zod';

const jorEl = new JorEl({ openAI: true });
```

Now, let's add some tools to the team. Tools are shared across all agents in the team, but agents can only use tools that are explicitly allowed.

The reason for this separation is that tools contain executors which cannot be easily serialized and at least partially managed in code instead of a database. Agents and tasks on the other hand are easily serializable.

```typescript
// First, register tools at the team level
// This makes tools available for use by any agent with proper permissions
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
```

Now let's create our first agent. This agent will be the main agent that handles user requests.

```typescript
// Create a main agent that can delegate to others
const mainAgent = jorEl.team.addAgent({
  name: "main_agent",
  description: "Main agent who handles user requests",
  systemMessageTemplate: 
    "You are a helpful assistant. " +
    "You can delegate tasks to other agents when needed. " +
    "Available agents: {{delegates}}",
});
```

We can now add a specialized weather agent as a delegate. Note that the agent only gets access to tools listed in allowedTools.

Delegation (in contrast to transfer, which just changes which agent is currently active on the current thread) creates a separate thread. The main agent passes a message to the delegate and waits for a response. The delegate then returns a result to the main agent.

```typescript
// Add a specialized weather agent as a delegate
// Note: The agent only gets access to tools listed in allowedTools
mainAgent.addDelegate({
  name: "weather_agent",
  description: "Specialist in weather information",
  systemMessageTemplate: 
    "You are a weather specialist. " +
    "Provide detailed weather information when asked.",
  allowedTools: ["get_weather"],  // References tool registered at team level
});
```

Now we can create a task.

```typescript
// Create and execute a task
const task = await jorEl.team.createTask(
  "What's the weather like in Sydney?"
);
```

At this point, the task is just a description of the task. We need to execute it to get a result.

```typescript
const result = await jorEl.team.executeTask(task, {
  limits: {
    maxIterations: 10,
    maxGenerations: 6,
    maxDelegations: 2,
  },
});

console.log(result.result);
// The current weather in Sydney is sunny with a temperature of 22°C.
```

## Key Concepts

### Agents

An agent is an LLM-powered entity with:
* A specific role and purpose defined by its system message
* Access to certain tools and capabilities
* The ability to communicate with other agents through delegation or transfer

Agents can be:
* Generalists handling various tasks
* Specialists focused on specific domains
* Coordinators managing other agents

Learn more in the [Simple Agent](./simple-agent.md) guide.

### Tasks

A task represents a unit of work to be processed by agents. It includes:
* The initial user request
* The processing history (messages, tool usage, delegations)
* The current state and final result

Tasks can be:
* Created from user input
* Executed to completion
* Processed step by step for more control
* Monitored through events and statistics

Learn more in the [Task Deep Dive](./task-deep-dive.md) guide.

### Agent Interactions

Agents can interact in two main ways:

1. **Delegation**: An agent temporarily hands off a subtask to another agent, then receives the result back
   

```typescript
   // Agent A delegates to Agent B
   mainAgent.addDelegate(weatherAgent);
   ```

   Learn more in the [Delegation](./delegation.md) guide.

2. **Transfer**: An agent completely hands over control to another agent
   

```typescript
   // Allow two-way transfer between agents
   mainAgent.addDelegate(weatherAgent, "transfer");
   weatherAgent.addDelegate(mainAgent, "transfer");
   ```

   Learn more in the [Transfer](./transfer.md) guide.

### Integration with JorEl Features

Agents can leverage all of JorEl's basic features:

* **Tools**: Tools must first be registered at the team level, then agents can be given access to them
  

```typescript
  // Register tools with the team
  jorEl.team.addTools([{
    name: "get_weather",
    executor: getWeather,
    // ... tool configuration
  }]);

  // Give an agent access to specific tools
  weatherAgent.allowedTools = ["get_weather", "convert_temperature"];
  ```

  This two-step process enables:
  + Centralized tool management
  + Easy task serialization and step-by-step processing
  + Clear permission control for agents

  See [Working with Tools](../basic-usage/tools.md)

* **Documents**: Agents can be provided with contextual documents
  

```typescript
  weatherAgent.documents = [{
    title: "Weather Guidelines",
    content: "Always include temperature and conditions..."
  }];
  ```

  See [Working with Documents](../basic-usage/documents.md)

* **Images**: Agents can process images when using vision-capable models
  

```typescript
  const task = await jorEl.team.createTask([
    "What's in this weather radar image?",
    await ImageContent.fromFile("./radar.png")
  ]);
  ```

  See [Using Images](../basic-usage/images.md)

## Next Steps

* Learn how to create a [Simple Agent](./simple-agent.md)
* Understand [Task Processing](./task-deep-dive.md) in detail
* Learn about [Transfer](./transfer.md) of control
* Explore [Delegation](./delegation.md) between agents
