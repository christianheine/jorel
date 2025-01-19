import { generateUniqueId } from "../shared";

export type CreateLlmDocument = Pick<LlmDocument, "title" | "content"> & Partial<LlmDocument>;

/**
 * A document that can be used for grounding LLM generations (either directly or passed to agents)
 */
export class LlmDocument {
  id: string;
  type: string;
  title: string;
  content: string;
  source?: string;

  constructor({ id, type, title, content, source }: CreateLlmDocument) {
    this.id = id || generateUniqueId();
    this.type = type || "text";
    this.title = title;
    this.content = content;
    this.source = source;
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
  get definition() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      content: this.content,
      source: this.source,
    };
  }
}
