import {generateUniqueId} from "./unique-ids";

export type CreateLlmDocument = Pick<LlmDocument, "title" | "content"> & Partial<LlmDocument>

export class LlmDocument {
  id: string;
  type: string;
  title: string;
  content: string;
  source?: string;

  constructor({id, type, title, content, source}: CreateLlmDocument) {
    this.id = id || generateUniqueId();
    this.type = type || "text";
    this.title = title;
    this.content = content;
    this.source = source;
  }

  static text(id: string, body: Pick<LlmDocument, "title" | "content"> & Partial<LlmDocument>): LlmDocument {
    return new LlmDocument({id, type: "text", ...body});
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      content: this.content,
      source: this.source,
    };
  }
}

const xmlDocumentToTextTemplate = "<Document></Document><DocumentId>{{id}}</DocumentId>\n<DocumentType>{{type}}</DocumentType>\n<Title>{{title}}</Title>\n<Content>{{content}}</Content>\n<Source>{{source}}</Source></Document>";

type DocumentToTextTemplate = "xml" | "json" | {
  template: string;
  separator: string;
};

interface LlmDocumentCollectionConfig {
  _documentToText?: DocumentToTextTemplate;
}

export class LlmDocumentCollection {
  private _documents: Map<string, LlmDocument>;
  public documentToTextTemplate: DocumentToTextTemplate;

  constructor(documents: (LlmDocument | CreateLlmDocument)[] = [], config: LlmDocumentCollectionConfig = {}) {
    const _documents = documents.map((document) => document instanceof LlmDocument ? document : new LlmDocument(document));
    this._documents = new Map(_documents.map((document) => [document.id, document]));
    this.documentToTextTemplate = config._documentToText || "xml";
  }

  get length() {
    return this._documents.size;
  }

  get all() {
    return Array.from(this._documents.values());
  }

  add(document: LlmDocument) {
    this._documents.set(document.id, document);
  }

  remove(id: string) {
    this._documents.delete(id);
  }

  get(id: string) {
    return this._documents.get(id);
  }

  toJSON() {
    return this.all.map((document) => document.toJSON());
  }

  static fromJSON(documents: (LlmDocument | CreateLlmDocument)[] = []) {
    return new LlmDocumentCollection(documents.map((document) => new LlmDocument(document instanceof LlmDocument ? document.toJSON() : document)));
  }

  toSystemMessage(): string {
    if (this.documentToTextTemplate === "json") return JSON.stringify(this.toJSON());

    const template = this.documentToTextTemplate === "xml" ? xmlDocumentToTextTemplate : this.documentToTextTemplate.template;

    const rendered = this.all.map((document) => {
      if (!template.includes("{{id}}")) throw new Error("Document template must include '{{id}}' placeholder.");
      if (!template.includes("{{content}}")) throw new Error("Document template must include '{{content}}' placeholder.");
      return template
        .replace("{{id}}", document.id)
        .replace("{{type}}", document.type)
        .replace("{{title}}", document.title)
        .replace("{{content}}", document.content)
        .replace("{{source}}", document.source || "n/a");
    });

    if (this.documentToTextTemplate === "xml") return `<Documents>\n${rendered.join("\n")}\n</Documents>`;

    return rendered.join(this.documentToTextTemplate.separator);
  }
}
