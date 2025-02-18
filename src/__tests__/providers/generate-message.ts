import {
  generateAssistantMessage,
  generateSystemMessage,
  generateUserMessage,
  LLmMessageTextContent,
  LlmToolCall,
} from "../../providers";
import { LlmDocument, LlmDocumentCollection } from "../../documents";

describe("generateUserMessage", () => {
  it("should generate a user message with the given content", async () => {
    const content = "Hello, world!";

    const result = await generateUserMessage(content);

    expect(result.role).toBe("user");
    expect(result.content[0].type).toBe("text");
    expect((result.content[0] as unknown as LLmMessageTextContent).text).toBe(content);
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
  });
});

describe("generateSystemMessage", () => {
  it("should generate a system message with just system message", () => {
    const systemMessage = "You are a helpful assistant";
    const result = generateSystemMessage(systemMessage);

    expect(result.role).toBe("system");
    expect(result.content).toBe(systemMessage);
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
  });

  it("should generate a system message with documents", () => {
    const systemMessage = "You are a helpful assistant";
    const documentSystemMessage = "Here are some documents: {{documents}}";
    const documents: LlmDocumentCollection = new LlmDocumentCollection([
      new LlmDocument({
        id: "1",
        title: "Document 1",
        content: "Document 1 content here",
      }),
      new LlmDocument({
        id: "2",
        title: "Document 2",
        content: "Document 2 content here",
      }),
    ]);

    const result = generateSystemMessage(systemMessage, documentSystemMessage, documents);

    expect(result.role).toBe("system");
    expect(result.content).toBe(
      "You are a helpful assistant\n" +
        "Here are some documents: <Documents>\n" +
        "<Document id='1' type='text' title='Document 1' source='n/a'>Document 1 content here</Document>\n" +
        "<Document id='2' type='text' title='Document 2' source='n/a'>Document 2 content here</Document>\n" +
        "</Documents>",
    );
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
  });

  it("should throw error if documents provided without document system message", () => {
    const systemMessage = "You are a helpful assistant";
    const documents: LlmDocumentCollection = new LlmDocumentCollection([
      new LlmDocument({
        id: "1",
        title: "Document 1",
        content: "Document content here",
      }),
    ]);

    expect(() => generateSystemMessage(systemMessage, undefined, documents)).toThrow(
      "Document system message must be provided when documents are provided.",
    );
  });

  it("should throw error if document system message doesn't include placeholder", () => {
    const systemMessage = "You are a helpful assistant";
    const documentSystemMessage = "Here are some documents";
    const documents: LlmDocumentCollection = new LlmDocumentCollection([
      new LlmDocument({
        id: "1",
        title: "Document 1",
        content: "Document content here",
      }),
    ]);

    expect(() => generateSystemMessage(systemMessage, documentSystemMessage, documents)).toThrow(
      "System message must include '{{documents}}' placeholder when documents are provided.",
    );
  });
});

describe("generateAssistantMessage", () => {
  it("should generate a basic assistant message", () => {
    const content = "I can help with that";
    const result = generateAssistantMessage(content);

    expect(result.role).toBe("assistant");
    expect(result.content).toBe(content);
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
  });

  it("should generate an assistant message with tool calls", () => {
    const content = "I can help with that";
    const toolCalls: LlmToolCall[] = [
      {
        id: "1",
        approvalState: "approved",
        executionState: "pending",
        request: {
          function: {
            name: "tool1",
            arguments: {},
          },
          id: "1",
        },
        result: null,
        error: null,
      },
    ];

    const result = generateAssistantMessage(content, toolCalls);

    expect(result.role).toBe("assistant_with_tools");
    expect(result.content).toBe(content);
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
    if (result.role === "assistant_with_tools") {
      expect(result.toolCalls).toBe(toolCalls);
    }
  });
});
