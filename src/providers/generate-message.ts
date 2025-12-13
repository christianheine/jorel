import { LlmDocumentCollection } from "../documents";
import { JorElTaskInput } from "../jorel";
import { generateMessageId, MessageIdGenerator, Nullable } from "../shared";
import {
  LlmAssistantMessage,
  LlmAssistantMessageWithToolCalls,
  LlmSystemMessage,
  LlmToolCall,
  LlmUserMessage,
  LlmUserMessageContent,
} from "./llm-core-provider";

export interface MessageIdOption {
  messageId: string;
}

type IdGeneratorOption = MessageIdGenerator | MessageIdOption;

const resolveMessageId = (option: IdGeneratorOption | undefined, timestamp?: number): string => {
  if (option && typeof option === "object" && "messageId" in option) {
    return option.messageId;
  }
  return generateMessageId(option as MessageIdGenerator | undefined, timestamp);
};

export const generateUserMessage = async (
  taskInput: JorElTaskInput,
  idOption?: IdGeneratorOption,
): Promise<LlmUserMessage> => {
  const id = resolveMessageId(idOption);
  const createdAt = Date.now();

  const baseMessage: Omit<LlmUserMessage, "content"> = {
    id,
    role: "user",
    createdAt,
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
    ...baseMessage,
    content,
  };
};

export const generateSystemMessage = (
  systemMessage: string,
  documentSystemMessage?: string,
  documents?: LlmDocumentCollection,
  idOption?: IdGeneratorOption,
): LlmSystemMessage => {
  const id = resolveMessageId(idOption);
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
  idOption?: IdGeneratorOption,
): LlmAssistantMessage | LlmAssistantMessageWithToolCalls => {
  const id = resolveMessageId(idOption);
  const createdAt = Date.now();
  if (!toolCalls || toolCalls.length === 0) {
    return { id, role: "assistant", content: content || "", reasoningContent, createdAt };
  }
  return { id, role: "assistant_with_tools", content: content || null, toolCalls, reasoningContent, createdAt };
};
