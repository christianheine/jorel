import {LlmMessage} from "./llm-core-provider";

export const generateMessage = (content: string, systemMessage: string) => {
  const messages: LlmMessage[] = [{role: "user", content}];
  if (systemMessage) messages.unshift({role: "system", content: systemMessage});
  return messages;
};