import { generateUniqueId, shallowFilterUndefined } from "../shared";

export type CreateLlmDocument = Pick<LlmDocument, "title" | "content"> &
  Partial<LlmDocument> & { attributes?: Record<string, string | number | boolean | null> };

export interface LlmDocumentDefinition {
  id: string;
  type: string;
  title: string;
  content: string;
  source?: string;
  attributes?: Record<string, string | number | boolean | null>;
}

/**
 * A document that can be used for grounding LLM generations (either directly or passed to agents)
 */
export class LlmDocument {
  id: string;
  type: string;
  title: string;
  content: string;
  source?: string;
  attributes?: Record<string, string | number | boolean | null>;

  constructor({ id, type, title, content, source, attributes }: CreateLlmDocument) {
    this.id = id || generateUniqueId();
    this.type = type || "text";
    this.title = title;
    this.content = content;
    this.source = source;
    this.attributes = attributes || {};
  }

  /**
   * Create a new text document
   */
  static text(id: string, body: Pick<LlmDocument, "title" | "content"> & Partial<LlmDocument>): LlmDocument {
    return new LlmDocument({ id, type: "text", ...body });
  }

  /**
   * Get the definition of the document (e.g. for serialization)
   */
  get definition(): LlmDocumentDefinition {
    return shallowFilterUndefined({
      id: this.id,
      type: this.type,
      title: this.title,
      content: this.content,
      source: this.source || undefined,
      attributes: this.attributes && Object.keys(this.attributes).length > 0 ? this.attributes : undefined,
    });
  }
}
