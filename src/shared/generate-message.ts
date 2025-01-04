import {LlmAssistantMessage, LlmAssistantMessageWithToolCalls, LlmSystemMessage, LlmToolCall, LlmUserMessage} from "./llm-core-provider";
import {JorElTaskInput} from "../jorel";
import {Nullable} from "./type-utils";

export const _userMessage = (content: JorElTaskInput): LlmUserMessage => ({role: "user", content});
export const _systemMessage = (content: string): LlmSystemMessage => ({role: "system", content});

export const _assistantMessage = (
  content: Nullable<string>,
  toolCalls?: LlmToolCall[]
): LlmAssistantMessage | LlmAssistantMessageWithToolCalls => {
  if (!toolCalls || toolCalls.length === 0) {
    return {role: "assistant", content: content || ""};
  }
  return {role: "assistant_with_tools", content: content || null, toolCalls};
};