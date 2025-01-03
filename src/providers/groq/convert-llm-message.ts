import {LlmMessage} from "../../shared";
import {ChatCompletionContentPart, ChatCompletionMessageParam} from "groq-sdk/resources/chat";
import {ImageContent} from "../../media";

/** Convert unified LLM messages to Groq messages (ChatCompletionMessageParam) */
export const convertLlmMessagesToGroqMessages = async (messages: LlmMessage[], detail?: "low" | "high"): Promise<ChatCompletionMessageParam[]> => {
  const convertedMessages: ChatCompletionMessageParam[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      convertedMessages.push(message);
    } else if (message.role === "assistant") {
      convertedMessages.push(message);
    } else if (message.role === "user") {
      if (typeof message.content === "string") {
        convertedMessages.push({
          role: message.role,
          content: message.content
        });
      } else if (Array.isArray(message.content)) {
        const content: ChatCompletionContentPart[] = [];

        for (const entry of message.content) {
          const _content = entry instanceof ImageContent ? await entry.toMessageContent() : entry;
          if (typeof _content === "string") {
            content.push({
              type: "text",
              text: _content
            });
          } else if (_content.type === "text") {
            content.push({
              type: "text",
              text: _content.text
            });
          } else if (_content.type === "imageUrl") {
            content.push({
              type: "image_url",
              image_url: {
                url: _content.url,
                detail
              }
            });
          } else if (_content.type === "imageData") {
            content.push({
              type: "image_url",
              image_url: {
                url: _content.data,
                detail
              }
            });
          } else {
            throw new Error(`Unsupported content type`);
          }
        }

        convertedMessages.push({
          role: message.role,
          content
        });
      }
    }
  }

  return convertedMessages;
};