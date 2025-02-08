import { CoreLlmMessage } from "../../providers";
import { Message, ToolCall } from "ollama";
import { ImageContent } from "../../media";
import { LlmToolKit } from "../../tools";

/** Convert unified LLM messages to Ollama messages (Message) */
export const convertLlmMessagesToOllamaMessages = async (messages: CoreLlmMessage[]): Promise<Message[]> => {
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
      });
    } else if (message.role === "assistant_with_tools") {
      convertedMessages.push({
        role: "assistant",
        content: message.content || "",
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
        } else if (toolCall.executionState === "error") {
          convertedMessages.push({
            role: "tool",
            content: toolCall.error.message,
          });
        }
      }
    } else if (message.role === "user") {
      if (typeof message.content === "string") {
        convertedMessages.push({
          role: message.role,
          content: message.content,
        });
      } else if (Array.isArray(message.content)) {
        const content: string[] = [];
        const images: Uint8Array[] = [];

        for (const entry of message.content) {
          if (entry instanceof ImageContent) {
            const image = await entry.toUint8Array();
            images.push(image);
          } else if (typeof entry === "string") {
            content.push(entry);
          } else if (entry.type === "text") {
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
  }

  return convertedMessages;
};
