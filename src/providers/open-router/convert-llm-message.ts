import type { ChatMessageContentItem, ChatMessageContentItemText, Message } from "@openrouter/sdk/esm/models";
import { LlmMessage } from "../../providers";

/**
 * Convert JorEl messages to OpenRouter format
 */
export const convertLlmMessagesToOpenRouterMessages = async (messages: LlmMessage[]): Promise<Message[]> => {
  const converted: Message[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      converted.push({
        role: "system",
        content: message.content,
      });
    } else if (message.role === "user") {
      if (typeof message.content === "string") {
        converted.push({
          role: "user",
          content: message.content,
        });
      } else {
        const contentItems: ChatMessageContentItem[] = [];
        for (const item of message.content) {
          if (item.type === "text") {
            contentItems.push({
              type: "text",
              text: item.text,
            });
          } else if (item.type === "imageUrl") {
            contentItems.push({
              type: "image_url",
              imageUrl: {
                url: item.url,
              },
            });
          } else if (item.type === "imageData") {
            contentItems.push({
              type: "image_url",
              imageUrl: {
                url: item.data,
              },
            });
          }
        }
        converted.push({
          role: "user",
          content: contentItems,
        });
      }
    } else if (message.role === "assistant") {
      converted.push({
        role: "assistant",
        content: message.content,
        reasoning: message.reasoningContent ?? undefined,
      });
    } else if (message.role === "assistant_with_tools") {
      converted.push({
        role: "assistant",
        content: message.content,
        reasoning: message.reasoningContent ?? undefined,
        toolCalls: message.toolCalls
          .filter((call) => call.executionState === "completed" || call.executionState === "error")
          .map((call) => ({
            id: call.request.id,
            type: "function",
            function: {
              name: call.request.function.name,
              arguments: JSON.stringify(call.request.function.arguments),
            },
          })),
      });

      // Add tool responses
      for (const toolCall of message.toolCalls) {
        if (toolCall.executionState === "completed") {
          converted.push({
            role: "tool",
            toolCallId: toolCall.request.id,
            content: JSON.stringify(toolCall.result),
          });
        } else if (toolCall.executionState === "error") {
          converted.push({
            role: "tool",
            toolCallId: toolCall.request.id,
            content: JSON.stringify({
              error: toolCall.error?.message || "Tool execution failed",
            }),
          });
        }
      }
    }
  }

  return converted;
};

/**
 * Extract text content from OpenRouter message content (handles both string and array formats)
 */
export const extractTextContent = (content: string | ChatMessageContentItem[] | null | undefined): string => {
  if (!content) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((item: ChatMessageContentItem) => item.type === "text")
      .map((item: ChatMessageContentItemText) => item.text)
      .join("");
  }

  return "";
};
