import { CoreLlmMessage } from "../../providers";
import { ImageContent } from "../../media";
import { LlmToolKit } from "../../tools";
import { ChatCompletionRequest } from "@mistralai/mistralai/models/components/chatcompletionrequest";
import { ContentChunk } from "@mistralai/mistralai/models/components/contentchunk";

/** Convert unified LLM messages to Mistral messages */
export const convertLlmMessagesToMistralMessages = async (
  messages: CoreLlmMessage[],
  detail?: "low" | "high",
): Promise<ChatCompletionRequest["messages"]> => {
  const convertedMessages: ChatCompletionRequest["messages"] = [];

  for (const message of messages) {
    switch (message.role) {
      case "system":
      case "assistant":
        convertedMessages.push({
          role: message.role,
          content: message.content,
        });
        break;

      case "assistant_with_tools":
        convertedMessages.push({
          role: "assistant",
          content: message.content,
          toolCalls: message.toolCalls.map((toolCall) => ({
            id: toolCall.request.id,
            type: "function" as const,
            function: {
              name: toolCall.request.function.name,
              arguments: LlmToolKit.serialize(toolCall.request.function.arguments),
            },
          })),
        });

        // Handle tool responses
        for (const toolCall of message.toolCalls) {
          if (toolCall.executionState === "completed") {
            convertedMessages.push({
              role: "tool",
              content: LlmToolKit.serialize(toolCall.result),
              toolCallId: toolCall.request.id,
            });
          } else if (toolCall.executionState === "error") {
            convertedMessages.push({
              role: "tool",
              content: toolCall.error.message,
              toolCallId: toolCall.request.id,
            });
          }
        }
        break;

      case "user":
        convertedMessages.push(await convertUserMessage(message, detail));
        break;

      default:
        throw new Error(`Unsupported message role: ${(message as any).role}`);
    }
  }

  return convertedMessages;
};

/** Convert user message content to Mistral format */
async function convertUserMessage(
  message: Extract<CoreLlmMessage, { role: "user" }>,
  detail?: "low" | "high",
): Promise<ChatCompletionRequest["messages"][number]> {
  if (typeof message.content === "string") {
    return {
      role: "user",
      content: message.content,
    };
  }

  if (!Array.isArray(message.content)) {
    throw new Error("User message content must be string or array");
  }

  const content: Array<ContentChunk> = [];

  for (const entry of message.content) {
    const _content = entry instanceof ImageContent ? await entry.toMessageContent() : entry;

    if (typeof _content === "string") {
      content.push({ type: "text", text: _content });
    } else
      switch (_content.type) {
        case "text":
          content.push({ type: "text", text: _content.text });
          break;
        case "imageUrl":
          content.push({
            type: "image_url",
            imageUrl: { url: _content.url, detail },
          });
          break;
        case "imageData":
          content.push({
            type: "image_url",
            imageUrl: { url: _content.data, detail },
          });
          break;
        default:
          throw new Error(`Unsupported content type: ${(_content as any).type}`);
      }
  }

  return { role: "user", content };
}
