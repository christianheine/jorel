/**
 * Extracts the Base64 part from a Data URL.
 * @param dataUrl The Data URL to extract the Base64 part from.
 * @returns The Base64 part of the Data URL.
 */
export const getBase64PartFromDataUrl = (dataUrl: string): string => {
  const base64String = dataUrl.split(",")[1];
  if (!base64String) {
    throw new Error("Invalid Data URL. Missing Base64 data.");
  }
  return base64String;
};
