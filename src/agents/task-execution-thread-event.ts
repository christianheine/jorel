import { Nullable } from "../shared";

export type TaskExecutionThreadEventType = "generation" | "delegation" | "transfer" | "threadChange" | "toolUse";

export interface TaskExecutionEventBase {
  timestamp: number;
  eventType: TaskExecutionThreadEventType;
  messageId: string;
  action: string;
}

export interface TaskExecutionThreadEvent_Generation extends TaskExecutionEventBase {
  eventType: "generation";
  model: string;
  tokenUsage: {
    input: Nullable<number>;
    output: Nullable<number>;
  };
}

export interface TaskExecutionThreadEvent_Delegation extends TaskExecutionEventBase {
  eventType: "delegation";
  delegateToAgentName: string;
}

export interface TaskExecutionThreadEvent_Transfer extends TaskExecutionEventBase {
  eventType: "transfer";
  fromAgentName: string;
  toAgentName: string;
}

export interface TaskExecutionThreadEvent_ThreadChange extends TaskExecutionEventBase {
  eventType: "threadChange";
  targetThreadId: string;
}

export interface TaskExecutionThreadEvent_ToolUse extends TaskExecutionEventBase {
  eventType: "toolUse";
  toolId: string;
  toolArguments: object;
  toolResult: unknown;
  toolError: Nullable<string>;
}

export type TaskExecutionThreadEvent =
  | TaskExecutionThreadEvent_Generation
  | TaskExecutionThreadEvent_Delegation
  | TaskExecutionThreadEvent_Transfer
  | TaskExecutionThreadEvent_ThreadChange
  | TaskExecutionThreadEvent_ToolUse;
