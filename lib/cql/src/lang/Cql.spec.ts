import { describe, expect, it, setSystemTime, beforeAll } from "bun:test";
import { createParser } from "./Cql";

describe("a query", () => {
  const systemTime = new Date("2020-01-15T00:00:00.000Z");
  const parser = createParser();
  beforeAll(() => {
    setSystemTime(systemTime);
  });

  it("should produce a query string", () => {
    const cqlResult = parser("+section:commentisfree");
    expect(cqlResult.queryStr).toBe("section=commentisfree");
  });

  it("should combine bare strings and search params", () => {
    const cqlResult = parser("marina +section:commentisfree");
    expect(cqlResult.queryStr).toBe("q=marina&section=commentisfree");
  });

  it("should combine quoted strings and search params", () => {
    const cqlResult = parser('"marina" +section:commentisfree');
    expect(cqlResult.queryStr).toBe("q=marina&section=commentisfree");
  });

  it("should permit boolean operations", () => {
    const cqlResult = parser('"marina" AND hyde +section:commentisfree');
    expect(cqlResult.queryStr).toBe(
      "q=marina%20AND%20hyde&section=commentisfree",
    );
  });

  it("should permit field queries", () => {
    const cqlResult = parser("+tag:example");
    expect(cqlResult.queryStr).toBe("tag=example");
  });

  it("should permit groups - 1", () => {
    const cqlResult = parser(
      '"marina" (hyde OR abramovic) +section:commentisfree',
    );

    expect(cqlResult.queryStr).toBe(
      "q=marina%20OR%20(hyde%20OR%20abramovic)&section=commentisfree",
    );
  });

  it("should permit groups - 2", () => {
    const cqlResult = parser("(hyde OR abramovic) +section:commentisfree");
    expect(cqlResult.queryStr).toBe(
      "q=(hyde%20OR%20abramovic)&section=commentisfree",
    );
  });

  it("should provide an error when keys are missing values", () => {
    const cqlResult = parser("+tag");
    expect(cqlResult.error?.message).toBe(
      "The field 'tag' needs a value after it (e.g. 'tag:tone/news')",
    );
  });

  describe("dates", () => {
    const addDaysToSystemTimeAsISODate = (days: number) => {
      const expectedDate = new Date(systemTime);
      expectedDate.setDate(systemTime.getDate() + days);
      return expectedDate.toISOString().substring(0, 10);
    };

    it("should not change absolute dates", () => {
      const cqlResult = parser("+from-date:1987-12-01");
      expect(cqlResult.queryStr).toBe("from-date=1987-12-01");
    });

    it("should parse relative dates into absolute dates — past dates", () => {
      const cqlResult = parser("+from-date:-1d");
      const expectedDateStr = addDaysToSystemTimeAsISODate(-1);

      expect(cqlResult.queryStr).toBe(`from-date=${expectedDateStr}`);
    });

    it("should parse relative dates into absolute dates — future dates", () => {
      const cqlResult = parser("+from-date:+1d");
      const expectedDateStr = addDaysToSystemTimeAsISODate(1);

      expect(cqlResult.queryStr).toBe(`from-date=${expectedDateStr}`);
    });
  });
});
