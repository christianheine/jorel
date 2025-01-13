import axios, { AxiosResponse } from "axios";

/**
 * Fetches a file from the given URL and returns it as a buffer.
 * @param url The URL to fetch the file from.
 * @param fallbackMimeType Fallback MIME type to use if the response headers do not contain a MIME type.
 * @returns The file as a buffer and its MIME type.
 */
export async function fetchFileAsBuffer(
  url: string,
  fallbackMimeType?: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  let response: AxiosResponse;

  try {
    response = await axios.get(url, { responseType: "arraybuffer" });
  } catch (error: unknown) {
    throw new Error(
      `Failed to fetch file from URL: ${url}. ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  const mimeType = response.headers["content-type"] || fallbackMimeType;

  if (!mimeType) {
    throw new Error("Unable to detect MIME type from the response headers.");
  }

  const buffer = Buffer.from(response.data);

  return {
    buffer,
    mimeType,
  };
}
