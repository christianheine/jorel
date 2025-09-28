import { ZodObject } from "zod";
import { LoggerOption, LogLevel, LogService } from "../logger";
import { Nullable } from "../shared";
import { LLmToolContextSegment, LlmToolKit } from "../tools";

export type LlmToolChoice = "none" | "auto" | "required" | string;
export type ReasoningEffort = "minimal" | "low" | "medium" | "high" | null;
export type Verbosity = "low" | "medium" | "high" | null;

export type JsonSpecification = ZodObject<any> | Record<string, unknown>;

export interface LlmModelParameterOverrides {
  noTemperature: boolean;
  noSystemMessage: boolean;
}

export interface StreamBufferConfig {
  /** Time in milliseconds to buffer content chunks before emitting. Default: 0 (no buffering) */
  bufferTimeMs?: number;
  /** Disable buffering entirely. Default: false */
  disabled?: boolean;
}

export type LlmModelParameterOverridesLookup = { [model: string]: Partial<LlmModelParameterOverrides> };

interface CoreLlmGenerationConfig {
  temperature?: Nullable<number>;
  maxTokens?: number;
  json?: boolean | JsonSpecification;
  jsonDescription?: string;
  tools?: LlmToolKit;
  toolChoice?: LlmToolChoice;
  logLevel?: LogLevel;
  verbosity?: Verbosity;
  reasoningEffort?: ReasoningEffort;
}

export interface LlmGenerationConfig extends CoreLlmGenerationConfig {
  logger?: LogService;
}

export interface InitLlmGenerationConfig extends CoreLlmGenerationConfig {
  logger?: LoggerOption | LogService;
}

export interface LlmSystemMessage {
  id?: string;
  role: "system";
  content: string;
  createdAt?: number;
}

export interface LLmMessageTextContent {
  type: "text";
  text: string;
}

export interface LLmMessageImageUrlContent {
  type: "imageUrl";
  mimeType?: string;
  url: string;
  metadata?: Record<string, number | string | boolean | null>;
}

export interface LLmMessageImageDataUrlContent {
  type: "imageData";
  mimeType?: string;
  data: string;
  metadata?: Record<string, number | string | boolean | null>;
}

export type LlmUserMessageContent = LLmMessageTextContent | LLmMessageImageUrlContent | LLmMessageImageDataUrlContent;

export interface LlmUserMessage {
  id?: string;
  role: "user";
  content: LlmUserMessageContent[];
  createdAt?: number;
}

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

export interface LlmToolCall__Cancelled {
  id: string;
  approvalState: LlmToolCallApprovalState;
  executionState: "cancelled";
  request: LlmToolCallRequest;
  result: null;
  error?: {
    type: string;
    message: string;
    numberOfAttempts: number;
    lastAttempt: Date;
  };
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

export type LlmToolCall =
  | LlmToolCall__Pending
  | LlmToolCall__InProgress
  | LlmToolCall__Completed
  | LlmToolCall__Error
  | LlmToolCall__Cancelled;

export interface LlmAssistantMessage {
  id: string;
  role: "assistant";
  content: string;
  meta?: LlmAssistantMessageMeta;
  createdAt?: number;
}

export interface LlmAssistantMessageWithToolCalls {
  id: string;
  role: "assistant_with_tools";
  content: Nullable<string>;
  toolCalls: LlmToolCall[];
  meta?: LlmAssistantMessageMeta;
  createdAt?: number;
}

export interface LlmAssistantMessageMeta {
  model: string;
  provider: string;
  temperature: number | undefined;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

export type LlmMessage = LlmSystemMessage | LlmUserMessage | LlmAssistantMessage | LlmAssistantMessageWithToolCalls;

export type LlmResponse = (LlmAssistantMessage | LlmAssistantMessageWithToolCalls) & { meta: LlmAssistantMessageMeta };

export interface LlmTextResponseWithMeta {
  response: string;
  meta: LlmAssistantMessageMeta;
  messages: LlmMessage[];
}

export interface LlmJsonResponseWithMeta {
  response: object;
  meta: LlmAssistantMessageMeta;
  messages: LlmMessage[];
}

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

export interface LlmStreamResponseWithToolCalls {
  type: "response";
  role: "assistant_with_tools";
  content: Nullable<string>;
  toolCalls: LlmToolCall[];
  meta: LlmAssistantMessageMeta;
}

export interface LlmStreamResponseMessages {
  type: "messages";
  messages: LlmMessage[];
}

export interface LlmStreamToolCallStarted {
  type: "toolCallStarted";
  toolCall: LlmToolCall__Pending;
}

export interface LlmStreamToolCallCompleted {
  type: "toolCallCompleted";
  toolCall: LlmToolCall__Completed | LlmToolCall__Error;
}

export interface LlmCoreProvider {
  readonly defaultName?: string;
  readonly name: string;

  generateResponse(model: string, messages: LlmMessage[], config?: LlmGenerationConfig): Promise<LlmResponse>;

  generateResponseStream(
    model: string,
    messages: LlmMessage[],
    config?: LlmGenerationConfig,
  ): AsyncGenerator<
    | LlmStreamResponseChunk
    | LlmStreamResponse
    | LlmStreamResponseWithToolCalls
    | LlmStreamToolCallStarted
    | LlmStreamToolCallCompleted,
    void,
    unknown
  >;

  getAvailableModels(): Promise<string[]>;

  createEmbedding(model: string, text: string): Promise<number[]>;
}
