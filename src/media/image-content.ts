import { promises } from "fs";
import { fromBuffer } from "file-type";
import { fetchFileAsBuffer } from "./utils";
import { LLmMessageImageDataUrlContent, LLmMessageImageUrlContent } from "../providers";
import { shallowFilterUndefined } from "../shared";

interface BufferImage {
  type: "buffer";
  buffer: Buffer;
  mimeType: string;
}

interface Base64Image {
  type: "base64";
  data: string;
  mimeType: string;
}

interface UrlImage {
  type: "url";
  url: string;
  mimeType: string;
}

type ImageSource = BufferImage | Base64Image | UrlImage;

export type ImageMetadata = Record<string, number | string | boolean | null>;

/**
 * Simplifies handling of images handed to JorEl. Instances of this class can be
 * created from a variety of sources, and can be passed directly to JorEl.
 */
export class ImageContent {
  /** @internal */
  private _source: ImageSource;
  readonly metadata?: ImageMetadata;

  constructor(source: ImageSource, metadata?: ImageMetadata) {
    this._source = source;
    this.metadata = metadata;
  }

  /**
   * Instantiates an image from a data URL
   * @param dataUrl - The data URL of the image
   * @param metadata - Metadata to attach to the image
   */
  static fromDataUrl(dataUrl: string, metadata: ImageMetadata = {}): ImageContent {
    const [mimeType, base64] = dataUrl.split(/[:;,]/).slice(1, 3);
    return new ImageContent(
      {
        type: "base64",
        data: base64,
        mimeType,
      },
      metadata,
    );
  }

  /**
   * Instantiates an image from a URL.
   *
   * By default, the image is downloaded, since some LLMs (like Ollama
   * and Anthropic) currently do not support URLs directly.
   * @param url - The URL of the image
   * @param mimeType - The MIME type of the image
   * @param downloadMedia - Whether to download the image or not
   * @param metadata - Metadata to attach to the image
   */
  static async fromUrl(
    url: string,
    mimeType: string,
    downloadMedia: false,
    metadata?: ImageMetadata,
  ): Promise<ImageContent>;
  static async fromUrl(
    url: string,
    mimeType?: string,
    downloadMedia?: true,
    metadata?: ImageMetadata,
  ): Promise<ImageContent>;
  static async fromUrl(
    url: string,
    mimeType?: string,
    downloadMedia: boolean = true,
    metadata?: ImageMetadata,
  ): Promise<ImageContent> {
    if (!downloadMedia) return new ImageContent({ type: "url", url, mimeType: mimeType || "" }, metadata);
    const buffer = await fetchFileAsBuffer(url, mimeType);
    return new ImageContent(
      {
        type: "buffer",
        buffer: buffer.buffer,
        mimeType: buffer.mimeType,
      },
      metadata,
    );
  }

  /**
   * Instantiates an array of images from an array of URLs
   * @param urls - Array of URLs
   * @param metadata - Metadata to attach to the images
   */
  static async fromUrls(urls: string[], metadata?: ImageMetadata): Promise<ImageContent[]> {
    return Promise.all(urls.map((url) => ImageContent.fromUrl(url, undefined, undefined, metadata)));
  }

  /**
   * Instantiates an image from an existing buffer
   * @param buffer - Buffer containing the image data
   * @param mimeType - (optional) MIME type of the image
   * @param metadata - Metadata to attach to the image
   * @throws Error - Error if the MIME type cannot be detected
   */
  static async fromBuffer(buffer: Buffer, mimeType?: string, metadata?: ImageMetadata): Promise<ImageContent> {
    const type = mimeType || (await fromBuffer(buffer))?.mime;
    if (!type) {
      throw new Error("Unsupported image type. Unable to detect MIME type from the buffer.");
    }
    return new ImageContent({ type: "buffer", buffer, mimeType: type }, metadata);
  }

  /**
   * Instantiates an image from a file path
   * @param filePath - Path to the image file
   * @param mimeType - (optional) MIME type of the image
   * @param metadata - Metadata to attach to the image
   * @throws Error - Error if the file cannot be read
   */
  static async fromFile(filePath: string, mimeType?: string, metadata?: ImageMetadata): Promise<ImageContent> {
    try {
      const buffer = await promises.readFile(filePath);
      return ImageContent.fromBuffer(buffer, mimeType, metadata);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
      throw new Error(`Failed to read file: ${filePath}, error: ${message}`);
    }
  }

  /**
   * Instantiates an array of images from an array of file paths
   * @param files - Array of file paths
   * @param mimeType - (optional) MIME type of the images
   * @param metadata - Metadata to attach to the images
   */
  static async fromFiles(files: string[], mimeType?: string, metadata?: ImageMetadata): Promise<ImageContent[]> {
    return Promise.all(files.map((file) => ImageContent.fromFile(file, mimeType, metadata)));
  }

  /**
   * Returns the image as a buffer
   * @returns The image buffer and its MIME type
   */
  async toBuffer(): Promise<{ buffer: Buffer; mimeType: string }> {
    if (this._source.type === "buffer") {
      return { buffer: this._source.buffer, mimeType: this._source.mimeType };
    } else if (this._source.type === "base64") {
      return {
        buffer: Buffer.from(this._source.data, "base64"),
        mimeType: this._source.mimeType,
      };
    } else {
      return fetchFileAsBuffer(this._source.url, this._source.mimeType);
    }
  }

  /**
   * Returns the image as a Uint8Array
   * @returns The image as a Uint8Array
   */
  async toUint8Array(): Promise<Uint8Array> {
    const { buffer } = await this.toBuffer();
    return new Uint8Array(buffer);
  }

  /**
   * Returns the image as a base64 string
   * @returns The image data and its MIME type
   */
  async toBase64(): Promise<{ data: string; mimeType: string }> {
    if (this._source.type === "base64") {
      return { data: this._source.data, mimeType: this._source.mimeType };
    } else if (this._source.type === "buffer") {
      return {
        data: this._source.buffer.toString("base64"),
        mimeType: this._source.mimeType,
      };
    } else {
      const buffer = await fetchFileAsBuffer(this._source.url, this._source.mimeType);
      return {
        data: buffer.buffer.toString("base64"),
        mimeType: buffer.mimeType,
      };
    }
  }

  /**
   * Returns the image as a data URL
   * @returns The image data URL
   */
  async toDataUrl(): Promise<string> {
    const { data, mimeType } = await this.toBase64();
    return `data:${mimeType};base64,${data}`;
  }

  /**
   * Returns the image as a message content
   * @param downloadUrls - Whether to download the image and return a data URL
   * @returns The image as a message content
   */
  async toMessageContent(downloadUrls?: false): Promise<LLmMessageImageDataUrlContent | LLmMessageImageUrlContent>;
  async toMessageContent(downloadUrls: true): Promise<LLmMessageImageDataUrlContent>;
  async toMessageContent(
    downloadUrls: boolean = false,
  ): Promise<LLmMessageImageUrlContent | LLmMessageImageDataUrlContent> {
    if (this._source.type === "url" && !downloadUrls) {
      return { type: "imageUrl", url: this._source.url, metadata: this.metadata };
    }
    const { data, mimeType } = await this.toBase64();
    return shallowFilterUndefined({
      type: "imageData",
      data: `data:${mimeType};base64,${data}`,
      mimeType,
      metadata: this.metadata,
    });
  }

  /**
   * Returns a string representation of the ImageContent instance
   * @returns A string describing the image source
   */
  toString(): string {
    switch (this._source.type) {
      case "buffer":
        return `ImageContent (buffer, MIME type: ${this._source.mimeType}, ${this._source.buffer.length} bytes)`;
      case "base64":
        return `ImageContent (base64, MIME type: ${this._source.mimeType}, ${this._source.data.length} bytes)`;
      case "url":
        return `ImageContent (URL: ${this._source.url}, MIME type: ${this._source.mimeType})`;
      default:
        return "ImageContent (unknown source)";
    }
  }
}
