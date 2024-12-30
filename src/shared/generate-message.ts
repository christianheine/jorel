import {LlmMessage} from "./llm-core-provider";
import {JorElTaskInput} from "../jorel";

export const generateMessage = (content: JorElTaskInput, systemMessage: string) => {
  const messages: LlmMessage[] = [{role: "user", content}];
  if (systemMessage) messages.unshift({role: "system", content: systemMessage});
  return messages;
};