import { ImageContent } from "../media";
import { Nullable } from "./type-utils";
import { LLmToolContextSegment, LlmToolKit } from "../tools";

export type LlmToolChoice = "none" | "auto" | "required" | string;

export interface LlmGenerationConfig {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  tools?: LlmToolKit;
  toolChoice?: LlmToolChoice;
}

export type LlmSystemMessage = {
  role: "system";
  content: string;
};

export interface LLmMessageTextContent {
  type: "text";
  text: string;
}

export interface LLmMessageImageUrlContent {
  type: "imageUrl";
  mimeType?: string;
  url: string;
}

export interface LLmMessageImageDataUrlContent {
  type: "imageData";
  mimeType?: string;
  data: string;
}

export type LlmUserMessageContent =
  | string
  | (string | LLmMessageTextContent | LLmMessageImageUrlContent | LLmMessageImageDataUrlContent | ImageContent)[];

export type LlmUserMessage = {
  role: "user";
  content: LlmUserMessageContent;
};

export type LlmFunctionParameter = "string" | "number" | "integer" | "boolean" | "array" | "object";

export interface LlmFunctionParameters {
  type?: LlmFunctionParameter;
  properties?: Record<string, Partial<LlmFunctionParameters>>;
  items?: Partial<LlmFunctionParameters> | Partial<LlmFunctionParameters>[];
  required?: string[];
  additionalProperties?: boolean | Partial<LlmFunctionParameters>;

  [key: string]: unknown;
}

export interface LlmFunction {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters?: LlmFunctionParameters;
  };
}

export interface LlmToolCallRequest {
  id: string;
  function: {
    name: string;
    arguments: object;
  };
}

export type LlmToolExecutionInputs = any;

export type LlmToolExecutionOutputs = any;

export type LlmToolExecutor = (
  ToolExecutionInputs: LlmToolExecutionInputs,
  context: LLmToolContextSegment,
  secureContext: LLmToolContextSegment,
) => Promise<LlmToolExecutionOutputs>;
export type LlmToolCallApprovalState = "noApprovalRequired" | "requiresApproval" | "approved" | "rejected";

export interface LlmToolCall__Pending {
  id: string;
  approvalState: LlmToolCallApprovalState;
  executionState: "pending";
  request: LlmToolCallRequest;
  result: null;
  error?: null;
}

export interface LlmToolCall__InProgress {
  id: string;
  approvalState: LlmToolCallApprovalState;
  executionState: "inProgress";
  request: LlmToolCallRequest;
  result: Nullable<object>;
  error?: null;
}

export interface LlmToolCall__Completed {
  id: string;
  approvalState: LlmToolCallApprovalState;
  executionState: "completed";
  request: LlmToolCallRequest;
  result: object;
  error?: null;
}

export interface LlmToolCall__Error {
  id: string;
  approvalState: LlmToolCallApprovalState;
  executionState: "error";
  request: LlmToolCallRequest;
  result: null;
  error: {
    type: string;
    message: string;
    numberOfAttempts: number;
    lastAttempt: Date;
  };
}

export type LlmToolCall = LlmToolCall__Pending | LlmToolCall__InProgress | LlmToolCall__Completed | LlmToolCall__Error;

export type LlmAssistantMessage = {
  role: "assistant";
  content: string;
  meta?: LlmAssistantMessageMeta;
};

export type LlmAssistantMessageWithToolCalls = {
  role: "assistant_with_tools";
  content: Nullable<string>;
  toolCalls: LlmToolCall[];
  meta?: LlmAssistantMessageMeta;
};

export interface LlmAssistantMessageMeta {
  model: string;
  provider: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

export type LlmMessage = LlmSystemMessage | LlmUserMessage | LlmAssistantMessage | LlmAssistantMessageWithToolCalls;

export type LlmResponse = (LlmAssistantMessage | LlmAssistantMessageWithToolCalls) & { meta: LlmAssistantMessageMeta };

export interface LlmStreamResponseChunk {
  type: "chunk";
  content: string;
}

export interface LlmStreamResponse {
  type: "response";
  role: "assistant";
  content: string;
  meta: LlmAssistantMessageMeta;
}

export interface LlmCoreProvider {
  readonly name: string;

  generateResponse(model: string, messages: LlmMessage[], config?: LlmGenerationConfig): Promise<LlmResponse>;

  generateResponseStream(
    model: string,
    messages: LlmMessage[],
    config?: LlmGenerationConfig,
  ): AsyncGenerator<LlmStreamResponseChunk, LlmStreamResponse, unknown>;

  getAvailableModels(): Promise<string[]>;

  createEmbedding(model: string, text: string): Promise<number[]>;
}
