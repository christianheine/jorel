import * as fs from "fs";
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

  /**
   * Write the document content to a local file
   * @param path
   */
  async writeContentToLocalFile(path: string): Promise<void> {
    await fs.promises.writeFile(path, this.content, "utf-8");
  }

  /**
   * @deprecated Use `fromFile` instead
   */
  static async fromLocalFile(
    path: string,
    meta: Partial<Pick<LlmDocument, "type" | "title" | "id">> = {},
  ): Promise<LlmDocument> {
    return LlmDocument.fromFile(path, meta);
  }

  /**
   * Create a new document from a local file
   */
  static async fromFile(
    path: string,
    meta: Partial<Pick<LlmDocument, "type" | "title" | "id">> = {},
  ): Promise<LlmDocument> {
    const content = await fs.promises.readFile(path, "utf-8");
    return new LlmDocument({
      id: meta.id || generateUniqueId(),
      type: meta.type || getDocumentType(path),
      title: meta.title || path.split("/").pop() || path,
      content,
      source: path,
    });
  }

  /**
   * Create a list of documents from local files
   */
  static async fromFiles(
    paths: string[],
    meta: Partial<Pick<LlmDocument, "type" | "title">> = {},
  ): Promise<LlmDocument[]> {
    return Promise.all(
      paths.map((path, index) =>
        LlmDocument.fromFile(path, {
          ...meta,
          title: meta.title ? `${meta.title} ${index + 1}` : undefined,
        }),
      ),
    );
  }

  /**
   * Create a new document from a URL
   */
  static async fromUrl(
    url: string,
    meta: Partial<Pick<LlmDocument, "type" | "title" | "id">> = {},
  ): Promise<LlmDocument> {
    const response = await fetch(url);
    const content = await response.text();
    return new LlmDocument({
      id: meta.id || generateUniqueId(),
      type: meta.type || "text",
      title: meta.title || url,
      content,
      source: url,
    });
  }

  /**
   * Create a list of documents from URLs
   */
  static async fromUrls(
    urls: string[],
    meta: Partial<Pick<LlmDocument, "type" | "title">> = {},
  ): Promise<LlmDocument[]> {
    return Promise.all(
      urls.map((url, index) =>
        LlmDocument.fromUrl(url, {
          ...meta,
          title: meta.title ? `${meta.title} ${index + 1}` : undefined,
        }),
      ),
    );
  }

  /**
   * Create a new markdown document
   */
  static md(payload: Pick<LlmDocument, "id" | "title" | "content"> & Partial<LlmDocument>): LlmDocument {
    return new LlmDocument({ type: "markdown", ...payload });
  }

  /**
   * Create a new text document
   */
  static text(payload: Pick<LlmDocument, "id" | "title" | "content"> & Partial<LlmDocument>): LlmDocument {
    return new LlmDocument({ type: "text", ...payload });
  }
}

const getDocumentType = (path: string): "TextFile" | "MarkdownFile" | "Document" => {
  const ext = path.split(".").pop();
  if (ext === "md") {
    return "MarkdownFile";
  }
  if (ext === "txt") {
    return "TextFile";
  }
  return "Document";
};
