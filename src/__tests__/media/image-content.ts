import {promises as fs} from "fs";
import {fetchFileAsBuffer} from "../../media/utils";
import {ImageContent} from "../../media";
import {fromBuffer} from "file-type";

jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
  },
}));
jest.mock("../../media/utils");
jest.mock("file-type");

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedFetchFileAsBuffer = fetchFileAsBuffer as jest.MockedFunction<typeof fetchFileAsBuffer>;
const mockedFromBuffer = fromBuffer as jest.MockedFunction<typeof fromBuffer>;

describe("ImageContent", () => {
  describe("fromDataUrl", () => {
    it("should create an ImageContent instance from a data URL", () => {
      const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA";
      const imageContent = ImageContent.fromDataUrl(dataUrl);
      expect(imageContent).toBeInstanceOf(ImageContent);
    });
  });

  describe("fromUrl", () => {
    it("should create an ImageContent instance from a URL without downloading", async () => {
      const url = "https://example.com/image.png";
      const mimeType = "image/png";
      const imageContent = await ImageContent.fromUrl(url, mimeType, false);
      expect(imageContent).toBeInstanceOf(ImageContent);
    });

    it("should create an ImageContent instance from a URL with downloading", async () => {
      const url = "https://example.com/image.png";
      const mimeType = "image/png";
      const buffer = Buffer.from("file data");
      mockedFetchFileAsBuffer.mockResolvedValue({buffer, mimeType});

      const imageContent = await ImageContent.fromUrl(url, mimeType, true);
      expect(imageContent).toBeInstanceOf(ImageContent);
    });
  });

  describe("fromBuffer", () => {
    it("should create an ImageContent instance from a buffer", async () => {
      const buffer = Buffer.from("file data");
      const mimeType = "image/png";
      mockedFromBuffer.mockResolvedValue({mime: mimeType, ext: "png"});

      const imageContent = await ImageContent.fromBuffer(buffer, mimeType);
      expect(imageContent).toBeInstanceOf(ImageContent);
    });

    it("should throw an error if MIME type cannot be detected", async () => {
      const buffer = Buffer.from("file data");
      mockedFromBuffer.mockResolvedValue(undefined);

      await expect(ImageContent.fromBuffer(buffer)).rejects.toThrow("Unsupported image type. Unable to detect MIME type from the buffer.");
    });
  });

  describe("fromFile", () => {
    it("should create an ImageContent instance from a file path", async () => {
      const filePath = "/path/to/image.png";
      const buffer = Buffer.from("file data");
      const mimeType = "image/png";
      mockedFs.readFile.mockResolvedValue(buffer);
      mockedFromBuffer.mockResolvedValue({mime: mimeType, ext: "png"});

      const imageContent = await ImageContent.fromFile(filePath, mimeType);
      expect(imageContent).toBeInstanceOf(ImageContent);
    });

    it("should throw an error if the file cannot be read", async () => {
      const filePath = "/path/to/image.png";
      mockedFs.readFile.mockRejectedValue(new Error("File not found"));

      await expect(ImageContent.fromFile(filePath)).rejects.toThrow("Failed to read file: /path/to/image.png, error: File not found");
    });
  });

  describe("toBuffer", () => {
    it("should return the image as a buffer", async () => {
      const buffer = Buffer.from("file data");
      const mimeType = "image/png";
      const imageContent = new ImageContent({type: "buffer", buffer, mimeType});

      const result = await imageContent.toBuffer();
      expect(result.buffer).toEqual(buffer);
      expect(result.mimeType).toBe(mimeType);
    });
  });

  describe("toBase64", () => {
    it("should return the image as a base64 string", async () => {
      const buffer = Buffer.from("file data");
      const mimeType = "image/png";
      const imageContent = new ImageContent({type: "buffer", buffer, mimeType});

      const result = await imageContent.toBase64();
      expect(result.data).toBe(buffer.toString("base64"));
      expect(result.mimeType).toBe(mimeType);
    });
  });

  describe("toDataUrl", () => {
    it("should return the image as a data URL", async () => {
      const buffer = Buffer.from("file data");
      const mimeType = "image/png";
      const imageContent = new ImageContent({type: "buffer", buffer, mimeType});

      const result = await imageContent.toDataUrl();
      expect(result).toBe(`data:${mimeType};base64,${buffer.toString("base64")}`);
    });
  });

  describe("toMessageContent", () => {
    it("should return the image as a message content", async () => {
      const buffer = Buffer.from("file data");
      const mimeType = "image/png";
      const imageContent = new ImageContent({type: "buffer", buffer, mimeType});

      const result = await imageContent.toMessageContent();
      expect(result).toEqual({type: "imageData", data: `data:${mimeType};base64,${buffer.toString("base64")}`, mimeType});
    });
  });
});