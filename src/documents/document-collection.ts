import { CreateLlmDocument, LlmDocument } from "./document";

/**
 * Check if a document type should be used as a semantic XML tag name.
 * Types starting with a capital letter (e.g., "Product", "CustomerProfile")
 * will be used as the XML tag name directly for better LLM performance.
 */
const isSemanticType = (type: string): boolean => /^[A-Z]/.test(type);

type DocumentToTextTemplate =
  | "xml"
  | "json"
  | {
      template: string;
      separator: string;
    };

interface LlmDocumentCollectionConfig {
  documentToText?: DocumentToTextTemplate;
}

/**
 * A collection of LLM documents, like a binder or folder of documents
 * that can be used for grounding LLM generations (either directly or passed to agents).
 *
 * Also provides a system message representation of the documents
 */
export class LlmDocumentCollection {
  public documentToTextTemplate: DocumentToTextTemplate;
  /** @internal */
  private _documents: Map<string, LlmDocument>;

  constructor(documents: (LlmDocument | CreateLlmDocument)[] = [], config: LlmDocumentCollectionConfig = {}) {
    const _documents = documents.map((document) =>
      document instanceof LlmDocument ? document : new LlmDocument(document),
    );
    this._documents = new Map(_documents.map((document) => [document.id, document]));
    this.documentToTextTemplate = config.documentToText || "xml";
  }

  /**
   * The number of documents in the collection
   */
  get length() {
    return this._documents.size;
  }

  /**
   * Get all documents in the collection (as a copy)
   */
  get all() {
    return Array.from(this._documents.values());
  }

  /**
   * Get the definition of all documents in the collection (e.g. for serialization)
   */
  get definition() {
    return this.all.map((document) => document.definition);
  }

  /**
   * Get a system message representation of the documents
   */
  get systemMessageRepresentation(): string {
    if (this._documents.size === 0) return "-";

    if (this.documentToTextTemplate === "json") return JSON.stringify(this.definition);

    // Default XML mode with semantic tag names
    if (this.documentToTextTemplate === "xml") {
      const rendered = this.all.map((document) => {
        // Use type as tag name if it starts with a capital letter (e.g., "Product", "CustomerProfile")
        // Otherwise use generic "Document" tag with type attribute
        const usesSemanticTag = document.type && isSemanticType(document.type);
        const tagName = usesSemanticTag ? document.type : "Document";

        const extraAttributes = document.attributes ? Object.entries(document.attributes) : [];
        const extraAttrsString = extraAttributes.map(([key, value]) => `${key}='${value}'`).join(" ");

        // Build attributes - only include type when using generic Document tag
        let attrs = `id='${document.id}'`;
        if (!usesSemanticTag) {
          attrs += ` type='${document.type}'`;
        }
        attrs += ` title='${document.title}'`;
        attrs += ` source='${document.source || "n/a"}'`;
        if (extraAttrsString) {
          attrs += ` ${extraAttrsString}`;
        }

        return `<${tagName} ${attrs}>${document.content}</${tagName}>`;
      });

      return `<Documents>\n${rendered.join("\n")}\n</Documents>`;
    }

    // Custom template handling
    const template = this.documentToTextTemplate.template;

    const rendered = this.all.map((document) => {
      if (!template.includes("{{id}}")) throw new Error("Document template must include '{{id}}' placeholder.");
      if (!template.includes("{{content}}"))
        throw new Error("Document template must include '{{content}}' placeholder.");

      const _attributes = document.attributes ? Object.entries(document.attributes) : [];
      const attributes = _attributes
        .map(([key, value]) => `${key}='${value}'`)
        .join(" ")
        .trim();

      // Calculate semantic tag name for custom templates that want to use it
      const usesSemanticTag = document.type && isSemanticType(document.type);
      const tagName = usesSemanticTag ? document.type : "Document";

      return template
        .replace(/\{\{tagName\}\}/g, tagName)
        .replace("{{id}}", document.id)
        .replace("{{type}}", document.type)
        .replace("{{title}}", document.title)
        .replace("{{content}}", document.content)
        .replace("{{attributes}}", attributes ? ` ${attributes}` : "")
        .replace("{{source}}", document.source || "n/a");
    });

    return rendered.join(this.documentToTextTemplate.separator);
  }

  /**
   * Create a new collection from a JSON representation
   */
  static fromJSON(documents: (LlmDocument | CreateLlmDocument)[] = []) {
    return new LlmDocumentCollection(
      documents.map((document) => new LlmDocument(document instanceof LlmDocument ? document.definition : document)),
    );
  }

  /**
   * Add a document to the collection
   */
  add(document: LlmDocument) {
    this._documents.set(document.id, document);
  }

  /**
   * Remove a document from the collection
   */
  remove(id: string) {
    this._documents.delete(id);
  }

  /**
   * Get a document by its ID
   */
  get(id: string) {
    return this._documents.get(id);
  }
}
