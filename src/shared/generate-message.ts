import {LlmAssistantMessage, LlmAssistantMessageWithToolCalls, LlmSystemMessage, LlmToolCall, LlmUserMessage} from "./llm-core-provider";
import {JorElTaskInput} from "../jorel";
import {Nullable} from "./type-utils";
import {LlmDocumentCollection} from "./documents";

export const generateUserMessage = (content: JorElTaskInput): LlmUserMessage => ({role: "user", content});

export const generateSystemMessage = (systemMessage: string, documentSystemMessage?: string, documents?: LlmDocumentCollection): LlmSystemMessage => {
  if (documents && documents.length > 0) {
    if (!documentSystemMessage) throw new Error("Document system message must be provided when documents are provided.");
    if (!documentSystemMessage.includes("{{documents}}")) {
      throw new Error("System message must include '{{documents}}' placeholder when documents are provided.");
    }
    return ({
      role: "system",
      content: systemMessage + "\n" + documentSystemMessage.replace("{{documents}}", documents.toSystemMessage())
    });
  }
  return ({role: "system", content: systemMessage});
};

export const generateAssistantMessage = (
  content: Nullable<string>,
  toolCalls?: LlmToolCall[]
): LlmAssistantMessage | LlmAssistantMessageWithToolCalls => {
  if (!toolCalls || toolCalls.length === 0) {
    return {role: "assistant", content: content || ""};
  }
  return {role: "assistant_with_tools", content: content || null, toolCalls};
};