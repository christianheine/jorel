// Mock for @openrouter/sdk to avoid ESM import issues in Jest tests
export class OpenRouter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(config?: any) {}

  chat = {
    sendChatCompletion: jest.fn(),
  };
}

export class EventStream {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(stream?: any) {}

  async *[Symbol.asyncIterator]() {
    yield {
      type: "chunk",
      data: {
        id: "test-id",
        choices: [
          {
            delta: {
              content: "test content",
              role: "assistant",
            },
            finish_reason: null,
          },
        ],
      },
    };
  }
}
