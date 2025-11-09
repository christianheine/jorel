import { generateUniqueId } from "../../shared";

describe("generateUniqueId", () => {
  it("should generate a valid UUID v7 string", () => {
    const uuid = generateUniqueId();
    // UUID v7 format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
    // where x is any hexadecimal digit and y is one of 8, 9, A, or B
    const uuidV7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidV7Regex);
  });

  it("should generate unique IDs on subsequent calls", () => {
    const uuids = new Set();
    for (let i = 0; i < 1000; i++) {
      uuids.add(generateUniqueId());
    }
    // If all UUIDs are unique, the set size should equal the number of iterations
    expect(uuids.size).toBe(1000);
  });

  it("should return a string of length 36", () => {
    const uuid = generateUniqueId();
    expect(uuid.length).toBe(36);
  });
});
