import {LlmMessage} from "../../shared";
import Anthropic from "@anthropic-ai/sdk";
import {ImageContent} from "../../media";
import {getBase64PartFromDataUrl} from "../../media/utils";

type ValidMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const validMediaTypes: ValidMediaType[] = [
  "image/jpeg", "image/png", "image/gif", "image/webp"
];

const validateMediaType = (mediaType?: string): ValidMediaType => {
  if (!mediaType) throw new Error("Missing media type");
  if (!validMediaTypes.includes(mediaType as ValidMediaType)) {
    throw new Error("Unsupported media type");
  }
  return mediaType as ValidMediaType;
};

/** Convert unified LLM messages to Anthropic messages */
export const convertLlmMessagesToAnthropicMessages = async (messages: LlmMessage[]): Promise<{
  systemMessage: string;
  chatMessages: Anthropic.MessageParam[]
}> => {
  const systemMessages = messages.filter(m => m.role === "system");
  const chatMessages = messages.filter(m => m.role !== "system");

  const systemMessage = systemMessages.map(m => m.content).join("\n");

  const convertedChatMessages: Anthropic.MessageParam[] = [];

  for (const message of chatMessages) {
    if (message.role === "assistant") {
      convertedChatMessages.push(message);
    } else if (message.role === "user") {
      if (typeof message.content === "string") {
        convertedChatMessages.push({
          role: "user",
          content: message.content
        });
      } else if (Array.isArray(message.content)) {
        const content: Anthropic.ContentBlockParam[] = [];
        for (const _content of message.content) {
          if (_content instanceof ImageContent) {
            const {data, mimeType} = await _content.toBase64();
            content.push({
              type: "image",
              source: {
                data,
                media_type: validateMediaType(mimeType),
                type: "base64"
              }
            });
          } else if (typeof _content === "string") {
            content.push({
              type: "text",
              text: _content
            });
          } else if (_content.type === "text") {
            content.push({
              type: "text",
              text: _content.text
            });
          } else if (_content.type === "imageData") {
            content.push({
              type: "image",
              source: {
                data: getBase64PartFromDataUrl(_content.data),
                media_type: validateMediaType(_content.mimeType),
                type: "base64"
              }
            });
          } else if (_content.type === "imageUrl") {
            throw new Error(`Image URLs are currently not supported by Anthropic`);
          } else {
            throw new Error(`Unsupported content type`);
          }
        }

        convertedChatMessages.push({
          role: message.role,
          content
        });
      }
    }
  }

  return {
    systemMessage,
    chatMessages: convertedChatMessages
  };
};