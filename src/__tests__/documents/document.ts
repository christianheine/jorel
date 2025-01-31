import { LlmDocument } from "../../documents";

describe("LlmDocument", () => {
  describe("constructor", () => {
    it("should create a document with minimal required fields", () => {
      const doc = new LlmDocument({
        title: "Test Document",
        content: "This is a test document",
      });

      expect(doc.title).toBe("Test Document");
      expect(doc.content).toBe("This is a test document");
      expect(doc.type).toBe("text"); // Default type
      expect(doc.id).toBeDefined(); // Should generate an ID
      expect(doc.attributes).toEqual({}); // Default empty attributes
      expect(doc.source).toBeUndefined();
    });

    it("should create a document with all fields", () => {
      const doc = new LlmDocument({
        id: "test-123",
        type: "markdown",
        title: "Full Document",
        content: "Content with all fields",
        source: "user",
        attributes: { important: true, count: 42 },
      });

      expect(doc.id).toBe("test-123");
      expect(doc.type).toBe("markdown");
      expect(doc.title).toBe("Full Document");
      expect(doc.content).toBe("Content with all fields");
      expect(doc.source).toBe("user");
      expect(doc.attributes).toEqual({ important: true, count: 42 });
    });
  });

  describe("text", () => {
    it("should create a text document with the static method", () => {
      const doc = LlmDocument.text({
        id: "text-123",
        title: "Static Text",
        content: "Created with static method",
        source: "test",
      });

      expect(doc.id).toBe("text-123");
      expect(doc.type).toBe("text");
      expect(doc.title).toBe("Static Text");
      expect(doc.content).toBe("Created with static method");
      expect(doc.source).toBe("test");
    });
  });

  describe("definition", () => {
    it("should return a clean definition without undefined values", () => {
      const doc = new LlmDocument({
        id: "def-123",
        type: "text",
        title: "Definition Test",
        content: "Testing definition getter",
      });

      const definition = doc.definition;

      expect(definition).toEqual({
        id: "def-123",
        type: "text",
        title: "Definition Test",
        content: "Testing definition getter",
      });

      // Should not include undefined or empty values
      expect(definition.source).toBeUndefined();
      expect(definition.attributes).toBeUndefined();
    });

    it("should include all defined values in definition", () => {
      const doc = new LlmDocument({
        id: "def-456",
        type: "text",
        title: "Full Definition",
        content: "Testing full definition",
        source: "test",
        attributes: { key: "value" },
      });

      expect(doc.definition).toEqual({
        id: "def-456",
        type: "text",
        title: "Full Definition",
        content: "Testing full definition",
        source: "test",
        attributes: { key: "value" },
      });
    });
  });
});
