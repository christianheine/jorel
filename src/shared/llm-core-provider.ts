export interface LlmGenerationConfig {
  temperature?: number;
  json?: boolean;
}

export type LlmSystemMessage = {
  role: "system";
  content: string;
}

export type LlmUserMessage = {
  role: "user";
  content: string;
}

export type LlmAssistantMessage = {
  role: "assistant";
  content: string;
}

export type LlmMessage = LlmSystemMessage | LlmUserMessage | LlmAssistantMessage;

export interface LlmResponse {
  content: string;
}

export interface LlmStreamResponseChunk {
  type: "chunk";
  content: string;
}

export interface LlmStreamResponse {
  type: "response";
  content: string;
}

export interface LlmCoreProvider {
  generateResponse(model: string, messages: LlmMessage[], config?: LlmGenerationConfig): Promise<LlmResponse>;

  generateResponseStream(model: string, messages: LlmMessage[], config?: LlmGenerationConfig): AsyncGenerator<LlmStreamResponseChunk, LlmStreamResponse, unknown>;
}