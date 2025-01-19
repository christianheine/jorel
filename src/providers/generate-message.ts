import {
  LlmAssistantMessage,
  LlmAssistantMessageWithToolCalls,
  LlmSystemMessage,
  LlmToolCall,
  LlmUserMessage,
} from "./llm-core-provider";
import { JorElTaskInput } from "../jorel";
import { generateUniqueId, Nullable } from "../shared";
import { LlmDocumentCollection } from "../documents";

export const generateUserMessage = (content: JorElTaskInput): LlmUserMessage => ({
  id: generateUniqueId(),
  role: "user",
  content,
  createdAt: Date.now(),
});

export const generateSystemMessage = (
  systemMessage: string,
  documentSystemMessage?: string,
  documents?: LlmDocumentCollection,
): LlmSystemMessage => {
  const id = generateUniqueId();
  const createdAt = Date.now();
  if (documents && documents.length > 0) {
    if (!documentSystemMessage)
      throw new Error("Document system message must be provided when documents are provided.");
    if (!documentSystemMessage.includes("{{documents}}")) {
      throw new Error("System message must include '{{documents}}' placeholder when documents are provided.");
    }
    return {
      id,
      role: "system",
      content:
        systemMessage + "\n" + documentSystemMessage.replace("{{documents}}", documents.systemMessageRepresentation),
      createdAt,
    };
  }
  return { id, role: "system", content: systemMessage, createdAt };
};

export const generateAssistantMessage = (
  content: Nullable<string>,
  toolCalls?: LlmToolCall[],
): LlmAssistantMessage | LlmAssistantMessageWithToolCalls => {
  const id = generateUniqueId();
  const createdAt = Date.now();
  if (!toolCalls || toolCalls.length === 0) {
    return { id, role: "assistant", content: content || "", createdAt };
  }
  return { id, role: "assistant_with_tools", content: content || null, toolCalls, createdAt };
};
