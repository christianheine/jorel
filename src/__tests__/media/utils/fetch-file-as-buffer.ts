import axios from "axios";
import { fetchFileAsBuffer } from "../../../media/utils";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("fetchFileAsBuffer", () => {
  it("should fetch a file and return it as a buffer with the correct MIME type", async () => {
    const url = "https://example.com/file.png";
    const mimeType = "image/png";
    const bufferData = Buffer.from("file data");

    mockedAxios.get.mockResolvedValue({
      data: bufferData,
      headers: { "content-type": mimeType },
    });

    const result = await fetchFileAsBuffer(url);
    expect(result.buffer).toEqual(bufferData);
    expect(result.mimeType).toBe(mimeType);
  });

  it("should use the fallback MIME type if the response headers do not contain a MIME type", async () => {
    const url = "https://example.com/file.png";
    const fallbackMimeType = "application/octet-stream";
    const bufferData = Buffer.from("file data");

    mockedAxios.get.mockResolvedValue({
      data: bufferData,
      headers: {},
    });

    const result = await fetchFileAsBuffer(url, fallbackMimeType);
    expect(result.buffer).toEqual(bufferData);
    expect(result.mimeType).toBe(fallbackMimeType);
  });

  it("should throw an error if the request fails", async () => {
    const url = "https://example.com/file.png";
    const errorMessage = "Network Error";

    mockedAxios.get.mockRejectedValue(new Error(errorMessage));

    await expect(fetchFileAsBuffer(url)).rejects.toThrow(`Failed to fetch file from URL: ${url}. ${errorMessage}`);
  });

  it("should throw an error if the MIME type cannot be detected", async () => {
    const url = "https://example.com/file.png";
    const bufferData = Buffer.from("file data");

    mockedAxios.get.mockResolvedValue({
      data: bufferData,
      headers: {},
    });

    await expect(fetchFileAsBuffer(url)).rejects.toThrow("Unable to detect MIME type from the response headers.");
  });
});
