import { ZodObject } from "zod";
import { LoggerOption, LogLevel, LogService } from "../logger";
import { Nullable } from "../shared";
import { LLmToolContextSegment, LlmToolKit } from "../tools";

export type LlmToolChoice = "none" | "auto" | "required" | string;
export type ReasoningEffort = "minimal" | "low" | "medium" | "high" | null;
export type Verbosity = "low" | "medium" | "high" | null;
export type ReasoningSummaryVerbosity = "auto" | "concise" | "detailed" | null;

export type JsonSpecification = ZodObject<any> | Record<string, unknown>;

export type LLmGenerationStopReason = "toolCallsRequireApproval" | "completed" | "userCancelled";

/**
 * Classification types for tool calls
 */
export type ToolCallClassification = "approvalPending" | "executionPending" | "completed";

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
  maxCompletionTokens?: number;
  json?: boolean | JsonSpecification;
  jsonDescription?: string;
  tools?: LlmToolKit;
  toolChoice?: LlmToolChoice;
  logLevel?: LogLevel;
  verbosity?: Verbosity;
  reasoningEffort?: ReasoningEffort;
  reasoningSummaryVerbosity?: ReasoningSummaryVerbosity;
  streamBuffer?: StreamBufferConfig;
  /** AbortSignal to cancel the generation request */
  abortSignal?: AbortSignal;
}

export interface LlmGenerationConfig extends CoreLlmGenerationConfig {
  logger?: LogService;
}

export interface InitLlmGenerationConfig extends CoreLlmGenerationConfig {
  logger?: LoggerOption | LogService;
}

/**
 * Minimal interface for messages in an array - only requires the fields we actually need
 */
export interface LlmMessageBase {
  id?: string;
  role: "assistant" | "assistant_with_tools" | "system" | "user";
}

/**
 * Generic type for objects that contain tool calls
 * This allows consumers to add additional fields while still using the toolkit
 */
export interface WithToolCalls {
  toolCalls: LlmToolCall[];
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
  providerMetadata?: Record<string, any>;
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
  reasoningContent?: Nullable<string>;
  meta?: LlmAssistantMessageMeta;
  createdAt?: number;
}

export interface LlmAssistantMessageWithToolCalls {
  id: string;
  role: "assistant_with_tools";
  content: Nullable<string>;
  reasoningContent?: Nullable<string>;
  toolCalls: LlmToolCall[];
  meta?: LlmAssistantMessageMeta;
  createdAt?: number;
}

export interface LlmGenerationAttempt {
  model: string;
  provider: string;
  temperature: number | undefined;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  /** Whether this generation included tool calls */
  hadToolCalls: boolean;
  /** Timestamp when this generation started */
  timestamp: number;
}

export interface LlmAssistantMessageMeta {
  model: string;
  provider: string;
  temperature: number | undefined;
  /** Total duration across all generations in milliseconds */
  durationMs: number;
  /** Total input tokens across all generations */
  inputTokens?: number;
  /** Total output tokens across all generations */
  outputTokens?: number;
  /** Total reasoning tokens across all generations */
  reasoningTokens?: number;
  /** Individual generation attempts (only present when multiple generations occurred) */
  generations?: LlmGenerationAttempt[];
}

export type LlmMessage = LlmSystemMessage | LlmUserMessage | LlmAssistantMessage | LlmAssistantMessageWithToolCalls;

export type LlmResponse = (LlmAssistantMessage | LlmAssistantMessageWithToolCalls) & { meta: LlmAssistantMessageMeta };

export interface LlmTextResponseWithMeta {
  response: string;
  meta: LlmAssistantMessageMeta;
  messages: LlmMessage[];
  stopReason: LLmGenerationStopReason;
}

export interface LlmJsonResponseWithMeta {
  response: object;
  meta: LlmAssistantMessageMeta;
  messages: LlmMessage[];
  stopReason: LLmGenerationStopReason;
}

export interface LlmStreamMessageStart {
  type: "messageStart";
  messageId: string;
}

export interface LlmStreamMessageEnd {
  type: "messageEnd";
  messageId: string;
  message: LlmMessage;
}

export interface LlmStreamProviderResponseChunk {
  type: "chunk";
  content: string;
  chunkId: string;
}

export interface LlmStreamProviderResponseReasoningChunk {
  type: "reasoningChunk";
  content: string;
  chunkId: string;
}

export interface LlmStreamResponseChunk {
  type: "chunk";
  content: string;
  chunkId: string;
  messageId: string;
}

export interface LlmStreamResponseReasoningChunk {
  type: "reasoningChunk";
  content: string;
  chunkId: string;
  messageId: string;
}

export interface LlmStreamResponse {
  type: "response";
  role: "assistant";
  content: string;
  reasoningContent: Nullable<string>;
  meta: LlmAssistantMessageMeta;
}

export interface LlmStreamResponseWithToolCalls {
  type: "response";
  role: "assistant_with_tools";
  content: Nullable<string>;
  reasoningContent: Nullable<string>;
  toolCalls: LlmToolCall[];
  meta: LlmAssistantMessageMeta;
}

export interface LlmStreamResponseMessages {
  type: "messages";
  messages: LlmMessage[];
  stopReason: LLmGenerationStopReason;
}

export interface LlmStreamToolCallStarted {
  type: "toolCallStarted";
  toolCall: LlmToolCall__Pending;
  toolCallId?: string;
}

export interface LlmStreamToolCallCompleted {
  type: "toolCallCompleted";
  toolCall: LlmToolCall__Completed | LlmToolCall__Error;
  toolCallId?: string;
}

export type LlmStreamProviderResponseChunkEvent =
  | LlmStreamProviderResponseChunk
  | LlmStreamProviderResponseReasoningChunk;

/** Response events are emitted when a new response chunk starts or ends */
export type LlmStreamResponseChunkEvent = LlmStreamResponseChunk | LlmStreamResponseReasoningChunk;
/** Response events are emitted when a new response starts or ends */
export type LlmStreamResponseEvent = LlmStreamResponse | LlmStreamResponseWithToolCalls;

/** Message events are emitted when a new message starts or ends */
export type LlmStreamMessageEvent = LlmStreamMessageStart | LlmStreamMessageEnd | LlmStreamResponseMessages;
/** Tool call events are emitted when a new tool call starts or completes */
export type LlmStreamToolCallEvent = LlmStreamToolCallStarted | LlmStreamToolCallCompleted;

/** All stream events */
export type LlmStreamEvent =
  | LlmStreamMessageEvent
  | LlmStreamResponseChunkEvent
  | LlmStreamToolCallEvent
  | LlmStreamResponseEvent;

export interface LlmCoreProvider {
  readonly defaultName?: string;
  readonly name: string;

  generateResponse(model: string, messages: LlmMessage[], config?: LlmGenerationConfig): Promise<LlmResponse>;

  generateResponseStream(
    model: string,
    messages: LlmMessage[],
    config?: LlmGenerationConfig,
  ): AsyncGenerator<LlmStreamProviderResponseChunkEvent | LlmStreamResponseEvent, void, unknown>;

  getAvailableModels(): Promise<string[]>;

  createEmbedding(model: string, text: string, abortSignal?: AbortSignal): Promise<number[]>;
}
