import { LlmDocumentCollection } from "../documents";
import { JorElTaskInput } from "../jorel";
import { generateUniqueId, Nullable } from "../shared";
import {
  LlmAssistantMessage,
  LlmAssistantMessageWithToolCalls,
  LlmSystemMessage,
  LlmToolCall,
  LlmUserMessage,
  LlmUserMessageContent,
} from "./llm-core-provider";

export const generateUserMessage = async (taskInput: JorElTaskInput): Promise<LlmUserMessage> => {
  const baseMessage: Omit<LlmUserMessage, "content"> = {
    id: generateUniqueId(),
    role: "user",
    createdAt: Date.now(),
  };

  if (typeof taskInput === "string") {
    return { ...baseMessage, content: [{ type: "text", text: taskInput }] };
  }

  const content: LlmUserMessageContent[] = [];

  for (const input of taskInput) {
    if (typeof input === "string") {
      content.push({ type: "text", text: input });
    } else {
      content.push(await input.toMessageContent());
    }
  }

  return {
    id: generateUniqueId(),
    role: "user",
    content,
    createdAt: Date.now(),
  };
};

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
  reasoningContent: Nullable<string> = null,
  toolCalls?: LlmToolCall[],
  messageId?: string,
): LlmAssistantMessage | LlmAssistantMessageWithToolCalls => {
  const id = messageId ?? generateUniqueId();
  const createdAt = Date.now();
  if (!toolCalls || toolCalls.length === 0) {
    return { id, role: "assistant", content: content || "", reasoningContent, createdAt };
  }
  return { id, role: "assistant_with_tools", content: content || null, toolCalls, reasoningContent, createdAt };
};
