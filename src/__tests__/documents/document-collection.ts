import { LlmDocument } from "../../documents/document";
import { LlmDocumentCollection } from "../../documents/document-collection";

describe("LlmDocumentCollection", () => {
  const sampleDoc1 = new LlmDocument({
    id: "doc1",
    title: "First Document",
    content: "Content of first document",
    type: "text",
  });

  const sampleDoc2 = new LlmDocument({
    id: "doc2",
    title: "Second Document",
    content: "Content of second document",
    type: "text",
    source: "user",
    attributes: { priority: 1 },
  });

  describe("constructor", () => {
    it("should create an empty collection", () => {
      const collection = new LlmDocumentCollection();
      expect(collection.length).toBe(0);
      expect(collection.all).toEqual([]);
    });

    it("should create a collection with initial documents", () => {
      const collection = new LlmDocumentCollection([sampleDoc1, sampleDoc2]);
      expect(collection.length).toBe(2);
      expect(collection.all).toHaveLength(2);
      expect(collection.get("doc1")).toBeDefined();
      expect(collection.get("doc2")).toBeDefined();
    });

    it("should accept CreateLlmDocument objects", () => {
      const collection = new LlmDocumentCollection([
        {
          title: "New Doc",
          content: "New content",
        },
      ]);
      expect(collection.length).toBe(1);
      const doc = collection.all[0];
      expect(doc.title).toBe("New Doc");
      expect(doc.content).toBe("New content");
      expect(doc.id).toBeDefined();
    });
  });

  describe("document management", () => {
    let collection: LlmDocumentCollection;

    beforeEach(() => {
      collection = new LlmDocumentCollection([sampleDoc1]);
    });

    it("should add documents", () => {
      collection.add(sampleDoc2);
      expect(collection.length).toBe(2);
      expect(collection.get("doc2")).toEqual(sampleDoc2);
    });

    it("should remove documents", () => {
      collection.remove("doc1");
      expect(collection.length).toBe(0);
      expect(collection.get("doc1")).toBeUndefined();
    });

    it("should get documents by id", () => {
      const doc = collection.get("doc1");
      expect(doc).toEqual(sampleDoc1);
    });

    it("should return undefined for non-existent documents", () => {
      expect(collection.get("nonexistent")).toBeUndefined();
    });

    it("should replace a document with the same id when adding", () => {
      const updatedDoc = new LlmDocument({
        id: "doc1",
        title: "Updated Document",
        content: "Updated content",
        type: "text",
      });

      collection.add(updatedDoc);
      expect(collection.length).toBe(1);
      expect(collection.get("doc1")).toEqual(updatedDoc);
      expect(collection.get("doc1")?.title).toBe("Updated Document");
    });
  });

  describe("serialization", () => {
    it("should create collection from JSON", () => {
      const collection = LlmDocumentCollection.fromJSON([
        {
          id: "json1",
          title: "JSON Doc",
          content: "JSON content",
          type: "text",
        },
      ]);

      expect(collection.length).toBe(1);
      const doc = collection.get("json1");
      expect(doc?.title).toBe("JSON Doc");
    });

    it("should get definition of all documents", () => {
      const collection = new LlmDocumentCollection([sampleDoc1, sampleDoc2]);
      const definition = collection.definition;

      expect(definition).toHaveLength(2);
      expect(definition[0]).toEqual(sampleDoc1.definition);
      expect(definition[1]).toEqual(sampleDoc2.definition);
    });

    it("should handle LlmDocument instances in fromJSON", () => {
      const existingDoc = new LlmDocument({
        id: "existing1",
        title: "Existing Doc",
        content: "Existing content",
        type: "text",
      });

      const collection = LlmDocumentCollection.fromJSON([existingDoc]);

      expect(collection.length).toBe(1);
      expect(collection.get("existing1")?.title).toBe("Existing Doc");
    });
  });

  describe("systemMessageRepresentation", () => {
    it("should return '-' for empty collection", () => {
      const collection = new LlmDocumentCollection();
      expect(collection.systemMessageRepresentation).toBe("-");
    });

    it("should format documents as XML by default", () => {
      const collection = new LlmDocumentCollection([sampleDoc1]);
      const representation = collection.systemMessageRepresentation;

      expect(representation).toContain("<Documents>");
      expect(representation).toContain(`<Document id='${sampleDoc1.id}'`);
      expect(representation).toContain("</Documents>");
    });

    it("should format documents as JSON when configured", () => {
      const collection = new LlmDocumentCollection([sampleDoc1], {
        documentToText: "json",
      });
      const representation = collection.systemMessageRepresentation;

      expect(JSON.parse(representation)).toEqual([sampleDoc1.definition]);
    });

    it("should use custom template when provided", () => {
      const collection = new LlmDocumentCollection([sampleDoc1], {
        documentToText: {
          template: "DOC[{{id}}]: {{content}}",
          separator: " | ",
        },
      });

      expect(collection.systemMessageRepresentation).toBe(`DOC[${sampleDoc1.id}]: ${sampleDoc1.content}`);
    });

    it("should include attributes in XML format", () => {
      const collection = new LlmDocumentCollection([sampleDoc2]);
      const representation = collection.systemMessageRepresentation;

      expect(representation).toContain("priority='1'");
    });

    it("should throw error if template missing required placeholders", () => {
      const collection = new LlmDocumentCollection([sampleDoc1], {
        documentToText: {
          template: "Invalid template",
          separator: " | ",
        },
      });

      expect(() => collection.systemMessageRepresentation).toThrow(
        "Document template must include '{{id}}' placeholder.",
      );
    });

    it("should throw error if template missing content placeholder", () => {
      const collection = new LlmDocumentCollection([sampleDoc1], {
        documentToText: {
          template: "DOC[{{id}}]: Missing content",
          separator: " | ",
        },
      });

      expect(() => collection.systemMessageRepresentation).toThrow(
        "Document template must include '{{content}}' placeholder.",
      );
    });

    it("should handle documents with all attributes in template", () => {
      const docWithAllFields = new LlmDocument({
        id: "full-doc",
        title: "Complete Document",
        content: "Full content",
        type: "special",
        source: "test-source",
        attributes: {
          priority: "high",
          status: "active",
          count: 42,
        },
      });

      const collection = new LlmDocumentCollection([docWithAllFields]);
      const representation = collection.systemMessageRepresentation;

      expect(representation).toContain(`id='full-doc'`);
      expect(representation).toContain(`title='Complete Document'`);
      expect(representation).toContain(`type='special'`);
      expect(representation).toContain(`source='test-source'`);
      expect(representation).toContain(`priority='high'`);
      expect(representation).toContain(`status='active'`);
      expect(representation).toContain(`count='42'`);
      expect(representation).toContain(`Full content`);
    });

    it("should handle custom template with only required placeholders", () => {
      const collection = new LlmDocumentCollection([sampleDoc1], {
        documentToText: {
          template: "{{id}}: {{content}}",
          separator: "\n---\n",
        },
      });

      expect(collection.systemMessageRepresentation).toBe(`${sampleDoc1.id}: ${sampleDoc1.content}`);
    });
  });
});
