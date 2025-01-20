import { CreateLlmDocument, LlmDocument } from "./document";

const xmlDocumentToTextTemplate =
  "<Document id='{{id}}' type='{{type}}' title='{{title}}' source='{{source}}'{{attributes}}>{{content}}</Document>";

type DocumentToTextTemplate =
  | "xml"
  | "json"
  | {
      template: string;
      separator: string;
    };

interface LlmDocumentCollectionConfig {
  _documentToText?: DocumentToTextTemplate;
}

/**
 * A collection of LLM documents, like a binder or folder of documents
 * that can be used for grounding LLM generations (either directly or passed to agents).
 *
 * Also provides a system message representation of the documents
 */
export class LlmDocumentCollection {
  public documentToTextTemplate: DocumentToTextTemplate;
  private _documents: Map<string, LlmDocument>;

  constructor(documents: (LlmDocument | CreateLlmDocument)[] = [], config: LlmDocumentCollectionConfig = {}) {
    const _documents = documents.map((document) =>
      document instanceof LlmDocument ? document : new LlmDocument(document),
    );
    this._documents = new Map(_documents.map((document) => [document.id, document]));
    this.documentToTextTemplate = config._documentToText || "xml";
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

    const template =
      this.documentToTextTemplate === "xml" ? xmlDocumentToTextTemplate : this.documentToTextTemplate.template;

    const rendered = this.all.map((document) => {
      if (!template.includes("{{id}}")) throw new Error("Document template must include '{{id}}' placeholder.");
      if (!template.includes("{{content}}"))
        throw new Error("Document template must include '{{content}}' placeholder.");
      const _attributes = document.attributes ? Object.entries(document.attributes): [];
      const attributes = _attributes.map(([key, value]) => `${key}='${value}'`).join(" ").trim();
      return template
        .replace("{{id}}", document.id)
        .replace("{{type}}", document.type)
        .replace("{{title}}", document.title)
        .replace("{{content}}", document.content)
        .replace("{{attributes}}", attributes ? ` ${attributes}` : "")
        .replace("{{source}}", document.source || "n/a");
    });

    if (this.documentToTextTemplate === "xml") return `<Documents>\n${rendered.join("\n")}\n</Documents>`;

    return rendered.join(this.documentToTextTemplate.separator);
  }
}
