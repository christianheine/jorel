import { ChatCompletionRequest } from "@mistralai/mistralai/models/components/chatcompletionrequest";
import { ContentChunk } from "@mistralai/mistralai/models/components/contentchunk";
import { LlmMessage } from "../../providers";
import { LlmToolKit } from "../../tools";

/** Convert unified LLM messages to Mistral messages */
export const convertLlmMessagesToMistralMessages = async (
  messages: LlmMessage[],
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
          } else if (toolCall.executionState === "error" || toolCall.executionState === "cancelled") {
            convertedMessages.push({
              role: "tool",
              content: toolCall.error?.message || "Cancelled",
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
  message: Extract<LlmMessage, { role: "user" }>,
  detail?: "low" | "high",
): Promise<ChatCompletionRequest["messages"][number]> {
  if (!Array.isArray(message.content)) {
    throw new Error("User message content must be string or array");
  }

  const content: Array<ContentChunk> = [];

  for (const entry of message.content) {
    switch (entry.type) {
      case "text":
        content.push({ type: "text", text: entry.text });
        break;
      case "imageUrl":
        content.push({
          type: "image_url",
          imageUrl: { url: entry.url, detail },
        });
        break;
      case "imageData":
        content.push({
          type: "image_url",
          imageUrl: { url: entry.data, detail },
        });
        break;
      default:
        throw new Error(`Unsupported content type: ${(entry as any).type}`);
    }
  }

  return { role: "user", content };
}
