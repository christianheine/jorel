import {generateMessage, LlmMessage} from "../../shared";
import {JorElTaskInput} from "../../jorel";
import {ImageContent} from "../../media";

describe("generateMessage", () => {
  it("should generate a message with user content", () => {
    const content: JorElTaskInput = "Test content";
    const systemMessage = "";
    const result = generateMessage(content, systemMessage);
    const expected: LlmMessage[] = [{role: "user", content}];
    expect(result).toEqual(expected);
  });

  it("should generate a message with user and system content", () => {
    const content: JorElTaskInput = "Test content";
    const systemMessage = "System message";
    const result = generateMessage(content, systemMessage);
    const expected: LlmMessage[] = [
      {role: "system", content: systemMessage},
      {role: "user", content}
    ];
    expect(result).toEqual(expected);
  });

  it("should handle empty user content", () => {
    const content: JorElTaskInput = "";
    const systemMessage = "System message";
    const result = generateMessage(content, systemMessage);
    const expected: LlmMessage[] = [
      {role: "system", content: systemMessage},
      {role: "user", content}
    ];
    expect(result).toEqual(expected);
  });

  it("should handle empty system message", () => {
    const content: JorElTaskInput = "Test content";
    const systemMessage = "";
    const result = generateMessage(content, systemMessage);
    const expected: LlmMessage[] = [{role: "user", content}];
    expect(result).toEqual(expected);
  });

  it("should handle empty user and system content", () => {
    const content: JorElTaskInput = "";
    const systemMessage = "";
    const result = generateMessage(content, systemMessage);
    const expected: LlmMessage[] = [{role: "user", content}];
    expect(result).toEqual(expected);
  });

  // mixed content (with an image)
  it("should generate a message with mixed content", async () => {
    const image = await ImageContent.fromUrl("https://example.com/image.jpg", "image/jpeg", false);
    const content: JorElTaskInput = ["What is in the image?", image];
    const systemMessage = "System message";
    const result = generateMessage(content, systemMessage);
    const expected: LlmMessage[] = [
      {role: "system", content: systemMessage},
      {role: "user", content}
    ];
    expect(result).toEqual(expected);
  });
});