import { Message, ToolCall } from "ollama";
import { ImageContent } from "../../media";
import { LlmMessage } from "../../providers";
import { LlmToolKit } from "../../tools";

/** Convert unified LLM messages to Ollama messages (Message) */
export const convertLlmMessagesToOllamaMessages = async (messages: LlmMessage[]): Promise<Message[]> => {
  const convertedMessages: Message[] = [];

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
        thinking: message.reasoningContent ?? undefined,
      });
    } else if (message.role === "assistant_with_tools") {
      convertedMessages.push({
        role: "assistant",
        content: message.content || "",
        thinking: message.reasoningContent ?? undefined,
        tool_calls: message.toolCalls.map(
          (toolCall): ToolCall => ({
            function: {
              name: toolCall.request.function.name,
              arguments: toolCall.request.function.arguments,
            },
          }),
        ),
      });
      for (const toolCall of message.toolCalls) {
        if (toolCall.executionState === "completed") {
          convertedMessages.push({
            role: "tool",
            content: LlmToolKit.serialize(toolCall.result),
          });
        } else if (toolCall.executionState === "error" || toolCall.executionState === "cancelled") {
          convertedMessages.push({
            role: "tool",
            content: toolCall.error?.message || "Cancelled",
          });
        }
      }
    } else if (message.role === "user") {
      const content: string[] = [];
      const images: Uint8Array[] = [];

      for (const entry of message.content) {
        if (entry.type === "text") {
          content.push(entry.text);
        } else if (entry.type === "imageUrl") {
          const image = await ImageContent.fromUrl(entry.url);
          images.push(await image.toUint8Array());
        } else if (entry.type === "imageData") {
          const image = ImageContent.fromDataUrl(entry.data);
          images.push(await image.toUint8Array());
        } else {
          throw new Error(`Unsupported content type`);
        }
      }

      convertedMessages.push({
        role: message.role,
        content: content.join(""),
        images: images.length > 0 ? images : undefined,
      });
    }
  }

  return convertedMessages;
};
