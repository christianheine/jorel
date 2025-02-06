import { maskAll, omit, shallowFilterUndefined } from "../../shared";

describe("object-utils", () => {
  describe("omit", () => {
    it("should remove specified keys from object", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, ["a", "c"]);
      expect(result).toEqual({ b: 2 });
    });

    it("should return a new object instance", () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, ["a"]);
      expect(result).not.toBe(obj);
    });

    it("should handle empty keys array", () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, []);
      expect(result).toEqual(obj);
    });
  });

  describe("maskAll", () => {
    it("should mask all values in object with asterisks", () => {
      const obj = { name: "John", password: "123", age: 25 };
      const result = maskAll(obj);
      expect(result).toEqual({
        name: "********",
        password: "********",
        age: "********",
      });
    });

    it("should return a new object instance", () => {
      const obj = { a: "secret" };
      const result = maskAll(obj);
      expect(result).not.toBe(obj);
    });

    it("should handle empty object", () => {
      const obj = {};
      const result = maskAll(obj);
      expect(result).toEqual({});
    });
  });

  describe("shallowFilterUndefined", () => {
    it("should remove undefined values from object", () => {
      const obj = {
        a: 1,
        b: undefined,
        c: "test",
        d: undefined,
      };
      const result = shallowFilterUndefined(obj);
      expect(result).toEqual({
        a: 1,
        c: "test",
      });
    });

    it("should keep null values", () => {
      const obj = {
        a: null,
        b: undefined,
      };
      const result = shallowFilterUndefined(obj);
      expect(result).toEqual({
        a: null,
      });
    });

    it("should handle empty object", () => {
      const obj = {};
      const result = shallowFilterUndefined(obj);
      expect(result).toEqual({});
    });
  });
});
