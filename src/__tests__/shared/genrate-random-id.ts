import { generateRandomId } from "../../shared";

describe("generateRandomId", () => {
  it("should generate a string of length 8", () => {
    const id = generateRandomId();
    expect(id.length).toBe(8);
  });

  it("should generate different IDs on subsequent calls", () => {
    const id1 = generateRandomId();
    const id2 = generateRandomId();
    expect(id1).not.toBe(id2);
  });

  it("should only contain alphanumeric characters", () => {
    const id = generateRandomId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });
});
