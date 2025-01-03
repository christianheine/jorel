import {LlmMessage} from "../../shared";
import {Content, Part} from "@google-cloud/vertexai";
import {ImageContent} from "../../media";
import {getBase64PartFromDataUrl} from "../../media/utils";

const textContentToParts = (text: string): Part[] => {
  return [
    {
      text
    }
  ];
};

const mixedContentToParts = async (content: LlmMessage["content"]): Promise<Part[]> => {
  if (typeof content === "string") {
    return textContentToParts(content);
  } else if (Array.isArray(content)) {
    const parts: Part[] = [];
    for (const _contentEntry of content) {
      if (_contentEntry instanceof ImageContent) {
        parts.push({
          inlineData: await _contentEntry.toBase64()
        });
      } else if (typeof _contentEntry === "string") {
        parts.push({
          text: _contentEntry
        });
      } else if (_contentEntry.type === "text") {
        parts.push({
          text: _contentEntry.text
        });
      } else if (_contentEntry.type === "imageData") {
        if (!_contentEntry.mimeType) {
          throw new Error(`Missing MIME type`);
        }
        parts.push({
          inlineData: {
            data: getBase64PartFromDataUrl(_contentEntry.data),
            mimeType: _contentEntry.mimeType
          }
        });
      } else if (_contentEntry.type === "imageUrl") {
        if (!_contentEntry.mimeType) {
          throw new Error(`Missing MIME type`);
        }
        parts.push({
          fileData: {
            fileUri: _contentEntry.url,
            mimeType: _contentEntry.mimeType
          }
        });
      } else {
        throw new Error(`Unsupported content type`);
      }
    }
    return parts;
  } else {
    throw new Error(`Unsupported content type`);
  }
};

/** Converts unified LLM messages to Vertex AI's messages (Content) */
export const convertLlmMessagesToVertexAiMessages = async (
  messages: LlmMessage[]
): Promise<{ systemMessage: string | undefined; chatMessages: Content[]; }> => {
  // 1. Extract system messages and join them together
  const systemMessages = messages.filter(m => m.role === "system");
  const systemMessage = (systemMessages.map(m => m.content).join("\n")).trim() || undefined;

// 2. Create the chat messages array by converting LLM messages to Vertex AI's Content
  const chatMessages: Content[] = [];
  for (const m of messages) {
    if (m.role !== "system") {
      if (m.role === "assistant") {
        chatMessages.push({
          role: "assistant",
          parts: textContentToParts(m.content)
        });
      } else if (m.role === "user") {
        if (typeof m.content === "string") {
          chatMessages.push({
            role: "user",
            parts: textContentToParts(m.content)
          });
        } else if (Array.isArray(m.content)) {
          chatMessages.push({
            role: m.role,
            parts: await mixedContentToParts(m.content)
          });
        }
      } else {
        throw new Error(`Unsupported message role`);
      }
    }
  }

  return {
    systemMessage,
    chatMessages
  };
};
