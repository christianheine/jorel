import { ChatCompletionContentPart, ChatCompletionMessageParam } from "groq-sdk/resources/chat";
import { LlmMessage } from "../../providers";
import { LlmToolKit } from "../../tools";

/** Convert unified LLM messages to Groq messages (ChatCompletionMessageParam) */
export const convertLlmMessagesToGroqMessages = async (
  messages: LlmMessage[],
  detail?: "low" | "high",
): Promise<ChatCompletionMessageParam[]> => {
  const convertedMessages: ChatCompletionMessageParam[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      convertedMessages.push({
        role: "system",
        content: message.content,
      });
    } else if (message.role === "assistant") {
      convertedMessages.push({
        role: "assistant",
        content: message.content,
      });
    } else if (message.role === "assistant_with_tools") {
      convertedMessages.push({
        role: "assistant",
        content: message.content,
        tool_calls: message.toolCalls.map((toolCall) => ({
          id: toolCall.request.id,
          type: "function",
          function: {
            name: toolCall.request.function.name,
            arguments: LlmToolKit.serialize(toolCall.request.function.arguments),
          },
        })),
      });
      for (const toolCall of message.toolCalls) {
        if (toolCall.executionState === "completed") {
          convertedMessages.push({
            role: "tool",
            content: LlmToolKit.serialize(toolCall.result),
            tool_call_id: toolCall.request.id,
          });
        } else if (toolCall.executionState === "error" || toolCall.executionState === "cancelled") {
          convertedMessages.push({
            role: "tool",
            content: toolCall.error?.message || "Cancelled",
            tool_call_id: toolCall.request.id,
          });
        }
      }
    } else if (message.role === "user") {
      const content: ChatCompletionContentPart[] = [];

      for (const _content of message.content) {
        if (_content.type === "text") {
          content.push({
            type: "text",
            text: _content.text,
          });
        } else if (_content.type === "imageUrl") {
          content.push({
            type: "image_url",
            image_url: {
              url: _content.url,
              detail,
            },
          });
        } else if (_content.type === "imageData") {
          content.push({
            type: "image_url",
            image_url: {
              url: _content.data,
              detail,
            },
          });
        } else {
          throw new Error(`Unsupported content type`);
        }
      }

      convertedMessages.push({
        role: message.role,
        content,
      });
    }
  }

  return convertedMessages;
};
