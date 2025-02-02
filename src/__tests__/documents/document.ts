import { LlmDocument } from "../../documents";
import * as fs from "fs";

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

  describe("fromFile", () => {
    it("should create a document from a markdown file", async () => {
      const doc = await LlmDocument.fromFile("src/__tests__/documents/testfile.md");

      expect(doc.id).toBeDefined();
      expect(doc.type).toBe("markdown");
      expect(doc.title).toBe("testfile.md");
      expect(doc.content).toBe("# headline\n\nSome content");
      expect(doc.source).toBe("src/__tests__/documents/testfile.md");
    });

    it("should create a document from a text file", async () => {
      const doc = await LlmDocument.fromFile("src/__tests__/documents/testfile.txt");

      expect(doc.id).toBeDefined();
      expect(doc.type).toBe("text");
      expect(doc.title).toBe("testfile.txt");
      expect(doc.content).toBe("Some content");
      expect(doc.source).toBe("src/__tests__/documents/testfile.txt");
    });

    it("should respect provided metadata when creating from file", async () => {
      const doc = await LlmDocument.fromFile("src/__tests__/documents/testfile.txt", {
        id: "custom-id",
        type: "text",
        title: "Custom Title",
      });

      expect(doc.id).toBe("custom-id");
      expect(doc.type).toBe("text");
      expect(doc.title).toBe("Custom Title");
      expect(doc.content).toBe("Some content");
    });
  });

  describe("fromFiles", () => {
    it("should create a list of documents from multiple files", async () => {
      const docs = await LlmDocument.fromFiles([
        "src/__tests__/documents/testfile.md",
        "src/__tests__/documents/testfile-2.md",
      ]);

      expect(docs).toHaveLength(2);

      expect(docs[0].title).toBe("testfile.md");
      expect(docs[0].content).toBe("# headline\n\nSome content");

      expect(docs[1].title).toBe("testfile-2.md");
      expect(docs[1].content).toBe("# headline 2\n\nMore content");
    });

    it("should respect provided metadata when creating from files", async () => {
      const docs = await LlmDocument.fromFiles(
        ["src/__tests__/documents/testfile.md", "src/__tests__/documents/testfile-2.md"],
        { type: "text", title: "Custom Title" },
      );

      expect(docs[0].type).toBe("text");
      expect(docs[0].title).toBe("Custom Title 1");
      expect(docs[0].content).toBe("# headline\n\nSome content");

      expect(docs[1].type).toBe("text");
      expect(docs[1].title).toBe("Custom Title 2");
      expect(docs[1].content).toBe("# headline 2\n\nMore content");
    });
  });

  describe("fromUrl", () => {
    it("should create a document from a URL", async () => {
      const doc = await LlmDocument.fromUrl("https://example.com");

      expect(doc.id).toBeDefined();
      expect(doc.type).toBe("text");
      expect(doc.title).toBe("https://example.com");
      expect(doc.content).toContain("Example Domain");
      expect(doc.source).toBe("https://example.com");
    });

    it("should respect provided metadata when creating from URL", async () => {
      const doc = await LlmDocument.fromUrl("https://example.com", {
        id: "custom-id",
        type: "markdown",
        title: "Custom Title",
      });

      expect(doc.id).toBe("custom-id");
      expect(doc.type).toBe("markdown");
      expect(doc.title).toBe("Custom Title");
      expect(doc.content).toContain("Example Domain");
    });
  });

  describe("writeContentToLocalFile", () => {
    it("should write document content to a file", async () => {
      const tempPath = "src/__tests__/documents/temp-test-file.txt";
      const doc = new LlmDocument({
        title: "Test Write",
        content: "Content to write",
      });

      await doc.writeContentToLocalFile(tempPath);

      const written = await fs.promises.readFile(tempPath, "utf-8");
      expect(written).toBe("Content to write");

      // Cleanup
      await fs.promises.unlink(tempPath);
    });
  });

  describe("md", () => {
    it("should create a markdown document with the static method", () => {
      const doc = LlmDocument.md({
        id: "md-123",
        title: "Markdown Doc",
        content: "# Markdown content",
        source: "test",
      });

      expect(doc.id).toBe("md-123");
      expect(doc.type).toBe("markdown");
      expect(doc.title).toBe("Markdown Doc");
      expect(doc.content).toBe("# Markdown content");
      expect(doc.source).toBe("test");
    });
  });
});
