import { dateReviver } from "../../shared";

describe("dateReviver", () => {
  it("converts ISO date strings to Date objects", () => {
    const dateStr = "2024-03-14T12:30:45.000Z";
    const result = dateReviver("", dateStr);

    expect(result).toBeInstanceOf(Date);
    if (result instanceof Date) {
      expect(result.toISOString()).toBe(dateStr);
    }
  });

  it("handles dates with milliseconds", () => {
    const dateStr = "2024-03-14T12:30:45.123Z";
    const result = dateReviver("", dateStr);

    expect(result).toBeInstanceOf(Date);
    if (result instanceof Date) {
      expect(result.toISOString()).toBe(dateStr);
    }
  });

  it("handles timezone offsets", () => {
    const dates = ["2024-03-14T12:30:45+01:00", "2024-03-14T12:30:45-05:00"];

    const expected = ["2024-03-14T11:30:45.000Z", "2024-03-14T17:30:45.000Z"];

    dates.forEach((dateStr, index) => {
      const result = dateReviver("", dateStr);
      expect(result).toBeInstanceOf(Date);
      if (result instanceof Date) {
        expect(result.toISOString()).toBe(expected[index]);
      }
    });
  });

  it("returns non-date strings unchanged", () => {
    const values = ["hello world", "2024", "2024-03-14", "12:30:45", "not-a-date"];

    values.forEach((value) => {
      expect(dateReviver("", value)).toBe(value);
    });
  });

  it("returns non-string values unchanged", () => {
    const values = [42, true, null, undefined, { key: "value" }, ["array"], new Date()];

    values.forEach((value) => {
      expect(dateReviver("", value)).toBe(value);
    });
  });

  it("works with JSON.parse", () => {
    const testObj = {
      date: "2024-03-14T12:30:45Z",
      nested: {
        anotherDate: "2024-03-14T15:45:30Z",
      },
      notADate: "hello",
      number: 42,
    };

    const jsonString = JSON.stringify(testObj);
    const parsed = JSON.parse(jsonString, dateReviver);

    expect(parsed.date).toBeInstanceOf(Date);
    expect(parsed.nested.anotherDate).toBeInstanceOf(Date);
    expect(parsed.notADate).toBe("hello");
    expect(parsed.number).toBe(42);
  });
});
