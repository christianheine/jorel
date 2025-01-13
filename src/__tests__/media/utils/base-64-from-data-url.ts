import { getBase64PartFromDataUrl } from "../../../media/utils";

describe("getBase64PartFromDataUrl", () => {
  it("should extract the Base64 part from a valid Data URL", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA";
    const base64Part = getBase64PartFromDataUrl(dataUrl);
    expect(base64Part).toBe("iVBORw0KGgoAAAANSUhEUgAAAAUA");
  });

  it("should throw an error for an invalid Data URL", () => {
    const invalidDataUrl = "data:image/png;base64,";
    expect(() => getBase64PartFromDataUrl(invalidDataUrl)).toThrow("Invalid Data URL. Missing Base64 data.");
  });

  it("should throw an error for a Data URL without a comma", () => {
    const invalidDataUrl = "data:image/png;base64iVBORw0KGgoAAAANSUhEUgAAAAUA";
    expect(() => getBase64PartFromDataUrl(invalidDataUrl)).toThrow("Invalid Data URL. Missing Base64 data.");
  });
});
