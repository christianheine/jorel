import {
  containsId,
  equalsId,
  extractId,
  extractIds,
  firstEntry,
  getById,
  getUniqueIds,
  type HasId,
  lastEntry,
  removeById,
  replaceById,
  unEqualsId,
} from "../../shared";

describe("array-utils", () => {
  type ExtendedHasId = HasId & {
    name: string;
  };

  const testObjects: ExtendedHasId[] = [
    { id: "1", name: "first" },
    { id: "2", name: "second" },
    { id: "3", name: "third" },
  ];

  describe("firstEntry", () => {
    it("returns first element of non-empty array", () => {
      expect(firstEntry(testObjects)).toEqual(testObjects[0]);
    });

    it("returns null for empty array", () => {
      expect(firstEntry([])).toBeNull();
    });
  });

  describe("lastEntry", () => {
    it("returns last element of non-empty array", () => {
      expect(lastEntry(testObjects)).toEqual(testObjects[2]);
    });

    it("returns null for empty array", () => {
      expect(lastEntry([])).toBeNull();
    });
  });

  describe("extractId", () => {
    it("extracts id from object", () => {
      expect(extractId(testObjects[0])).toBe("1");
    });

    it("returns string id as is", () => {
      expect(extractId("test-id")).toBe("test-id");
    });
  });

  describe("extractIds", () => {
    it("extracts ids from array of objects", () => {
      expect(extractIds(testObjects)).toEqual(["1", "2", "3"]);
    });
  });

  describe("getUniqueIds", () => {
    const duplicateObjects = [...testObjects, { id: "1", name: "duplicate" }];

    it("returns array of unique ids by default", () => {
      expect(getUniqueIds(duplicateObjects)).toEqual(["1", "2", "3"]);
    });

    it("returns Set of unique ids when asSet is true", () => {
      const result = getUniqueIds(duplicateObjects, true);
      expect(result).toBeInstanceOf(Set);
      expect(Array.from(result)).toEqual(["1", "2", "3"]);
    });
  });

  describe("equalsId", () => {
    it("returns true for matching ids", () => {
      expect(equalsId(testObjects[0])(testObjects[0])).toBe(true);
      expect(equalsId("1")({ id: "1" })).toBe(true);
    });

    it("returns false for different ids", () => {
      expect(equalsId(testObjects[0])(testObjects[1])).toBe(false);
    });
  });

  describe("unEqualsId", () => {
    it("returns true for different ids", () => {
      expect(unEqualsId(testObjects[0])(testObjects[1])).toBe(true);
    });

    it("returns false for matching ids", () => {
      expect(unEqualsId(testObjects[0])(testObjects[0])).toBe(false);
    });
  });

  describe("containsId", () => {
    it("returns true when id is found", () => {
      expect(containsId(testObjects, "1")).toBe(true);
      expect(containsId(testObjects, { id: "1" })).toBe(true);
    });

    it("returns false when id is not found", () => {
      expect(containsId(testObjects, "non-existent")).toBe(false);
    });
  });

  describe("replaceById", () => {
    it("replaces existing object", () => {
      const replacement = { id: "2", name: "replaced" };
      const result = replaceById(testObjects, replacement);
      expect(result.find((obj) => obj.id === "2")).toEqual(replacement);
      expect(result.length).toBe(testObjects.length);
    });

    it("adds object when not found and addIfNotFound is true", () => {
      const newObject = { id: "4", name: "new" };
      const result = replaceById(testObjects, newObject, true);
      expect(result).toContainEqual(newObject);
      expect(result.length).toBe(testObjects.length + 1);
    });

    it("does not add object when not found and addIfNotFound is false", () => {
      const newObject = { id: "4", name: "new" };
      const result = replaceById(testObjects, newObject);
      expect(result).toEqual(testObjects);
    });
  });

  describe("getById", () => {
    it("returns object when found", () => {
      expect(getById(testObjects, "2")).toEqual(testObjects[1]);
    });

    it("returns null when not found", () => {
      expect(getById(testObjects, "non-existent")).toBeNull();
    });
  });

  describe("removeById", () => {
    it("removes object when found", () => {
      const result = removeById(testObjects, "2");
      expect(result).toHaveLength(testObjects.length - 1);
      expect(result.find((obj) => obj.id === "2")).toBeUndefined();
    });

    it("returns same array when id not found", () => {
      const result = removeById(testObjects, "non-existent");
      expect(result).toEqual(testObjects);
    });
  });
});
