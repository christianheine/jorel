---
sidebar_position: 3
---

# Task Processing Deep Dive

Tasks in JorEl are powerful abstractions that represent conversations with agents. This guide explores advanced task concepts and features.

## Task Lifecycle

A task goes through several states during its lifecycle:

```typescript
type TaskExecutionStatus = "pending" | "running" | "halted" | "completed";
```

1. **Pending**: Initial state after task creation
2. **Running**: Task is being processed
3. **Halted**: Task stopped due to limits, approvals, or errors
4. **Completed**: Task finished successfully

## Task Structure

A task consists of:

* **Threads**: Conversations between agents and users
* **Events**: Record of actions taken during processing
* **State**: Current status and processing information
* **Statistics**: Usage data and metrics

### Understanding Threads

Each task has at least one thread (the main thread). Additional threads are created during delegation:

```typescript
const task = await jorEl.team.createTask("What's the weather like?");

// The main thread is automatically created
console.log(task.threads["__main__"]);
// {
//   id: "__main__",
//   agentId: "weather_agent",
//   messages: [/* conversation messages */],
//   events: [/* thread events */],
//   parentThreadId: null,  // Main thread has no parent
// }
```

### Event Tracking

Tasks track various events during processing:

```typescript
const { events } = result.eventsWithStatistics;

// Events show the full processing history
for (const event of events) {
  console.log({
    type: event.eventType,     // 'generation' | 'toolUse' | 'delegation' | 'transfer'
    action: event.action,      // Human-readable description
    timestamp: event.timestamp,
    threadId: event.threadId,
    messageId: event.messageId,
  });
}
```

## Step-by-Step Processing

While `executeTask` is convenient, processing tasks step-by-step gives you more control:

```typescript
const task = await jorEl.team.createTask(
  "What's the weather in Sydney?"
);

let currentTask = task;
while (currentTask.status !== "completed" && currentTask.status !== "halted") {
  // Process one step
  currentTask = await jorEl.team.resumeTask(currentTask);
  
  // Check the latest event
  const event = currentTask.events[currentTask.events.length - 1];
  
  // Handle different event types
  switch (event.eventType) {
    case "generation":
      console.log("Agent generated a response");
      break;
    case "toolUse":
      console.log("Agent used a tool");
      if (event.toolError) {
        console.error("Tool error:", event.toolError);
      }
      break;
    case "delegation":
      console.log("Agent delegated to:", event.delegateToAgentName);
      break;
    case "transfer":
      console.log(
        "Transfer from", event.fromAgentName,
        "to", event.toAgentName
      );
      break;
  }
}
```

## Tool Call Approvals

You can require approval for tool usage:

```typescript
// Register tool with approval requirement
jorEl.team.addTools([{
  name: "send_email",
  description: "Send an email to a user",
  requiresConfirmation: true,  // Requires approval
  executor: sendEmail,
  params: z.object({
    to: z.string(),
    subject: z.string(),
    body: z.string(),
  }),
}]);

// Process task until approval needed
let currentTask = task;
while (currentTask.status !== "completed") {
  currentTask = await jorEl.team.resumeTask(currentTask);
  
  if (currentTask.status === "halted" && 
      currentTask.haltReason === "approvalRequired") {
    
    // Get pending tool calls
    const toolCalls = currentTask.activeThread.latestMessage.toolCalls;
    
    // Review and approve/reject each call
    for (const call of toolCalls) {
      if (call.approvalState === "requiresApproval") {
        // Review the call
        console.log("Tool:", call.request.function.name);
        console.log("Args:", call.request.function.arguments);
        
        // Approve or reject
        if (confirmWithUser(call)) {
          jorEl.team.tools.approveCalls(currentTask, call.id);
        } else {
          jorEl.team.tools.rejectCalls(currentTask, call.id);
        }
      }
    }
    
    // Resume processing
    currentTask = await jorEl.team.resumeTask(currentTask);
  }
}
```

## Error Handling

Tasks can halt for various reasons:

```typescript
type TaskExecutionHaltingReason =
  | "maxIterations"    // Too many processing steps
  | "maxGenerations"   // Too many LLM calls
  | "maxDelegations"   // Too many agent delegations
  | "approvalRequired" // Tool needs approval
  | "invalidState"     // Task in invalid state
  | "error"           // General error
  | "completed";      // Task completed

// Handle different halt reasons
if (task.status === "halted") {
  switch (task.haltReason) {
    case "maxIterations":
      console.log("Task took too many steps");
      break;
    case "maxGenerations":
      console.log("Cost limit reached");
      break;
    case "maxDelegations":
      console.log("Too many delegations");
      break;
    case "approvalRequired":
      console.log("Tool needs approval");
      break;
    case "invalidState":
      console.log("Task in invalid state");
      break;
    case "error":
      console.log("Task error");
      break;
  }
}
```

## Serialization and Hydration

Tasks can be serialized for storage and hydrated for later use:

```typescript
// Get task definition (for storage)
const definition = task.definition;
// {
//   id: string;
//   status: TaskExecutionStatus;
//   threads: { [threadId: string]: ThreadDefinition };
//   activeThreadId: string;
//   stats: { generations: number; delegations: number };
//   modified: boolean;
//   haltReason: string | null;
// }

// Store the definition (e.g., in a database)
await db.tasks.save(definition);

// Later, hydrate the task
const storedDefinition = await db.tasks.get(taskId);
const hydratedTask = jorEl.team.hydrateTask(storedDefinition);

// Continue processing
const result = await jorEl.team.executeTask(hydratedTask);
```

This enables:
* Saving long-running tasks
* Implementing approval workflows
* Building user interfaces for task monitoring
* Creating task queues and job systems

## Best Practices

1. **Appropriate Limits**: Always set reasonable limits
   

```typescript
   const result = await jorEl.team.executeTask(task, {
     limits: {
       maxIterations: 10,
       maxGenerations: 6,
       maxDelegations: 2,
     },
   });
   ```

2. **Event Monitoring**: Track events for debugging and monitoring
   

```typescript
   const { events, stats, tokens } = task.eventsWithStatistics;
   ```

3. **Error Recovery**: Handle halted tasks appropriately
   

```typescript
   if (task.status === "halted") {
     // Log the reason
     console.log(`Task halted: ${task.haltReason}`);
     
     // Take appropriate action
     if (task.haltReason === "maxGenerations") {
       // Maybe increase the limit and retry
       task = await jorEl.team.executeTask(task, {
         limits: { maxGenerations: 12 },
       });
     }
   }
   ```

4. **Approval Workflows**: Design clear approval processes
   

```typescript
   // Example approval workflow
   async function processWithApprovals(task) {
     while (task.status !== "completed") {
       task = await jorEl.team.resumeTask(task);
       if (task.status === "halted" && 
           task.haltReason === "approvalRequired") {
         await handleApprovals(task);
       }
     }
     return task;
   }
   ```

## Next Steps

* Learn about [Delegation](./delegation.md) between agents
* Explore [Transfer](./transfer.md) of control
