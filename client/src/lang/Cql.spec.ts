import { describe, expect, it } from "bun:test";
import { Typeahead } from "./typeahead";
import { Cql } from "./Cql";
import { TestTypeaheadHelpers } from "./fixtures/TestTypeaheadHelpers";

describe("a query", () => {
  const typeaheadHelpers = new TestTypeaheadHelpers();
  const typeahead = new Typeahead(typeaheadHelpers.fieldResolvers);

  const cql = new Cql(typeahead);
  it("should produce a query string", async () => {
    const cqlResult = await cql.parse("+section:commentisfree");
    expect(cqlResult.queryResult).toBe("section=commentisfree");
  });

  it("should combine bare strings and search params", async () => {
    const cqlResult = await cql.parse("marina +section:commentisfree");
    expect(cqlResult.queryResult).toBe("q=marina&section=commentisfree");
  });

  it("should combine quoted strings and search params", async () => {
    const cqlResult = await cql.parse('"marina" +section:commentisfree');
    expect(cqlResult.queryResult).toBe("q=marina&section=commentisfree");
  });

  it("should permit boolean operations", async () => {
    const cqlResult = await cql.parse(
      '"marina" AND hyde +section:commentisfree'
    );
    expect(cqlResult.queryResult).toBe(
      "q=marina%20AND%20hyde&section=commentisfree"
    );
  });

  it("should permit field queries", async () => {
    const cqlResult = await cql.parse("+tag:example");
    expect(cqlResult.queryResult).toBe("tag=example");
  });

  it("should permit groups - 1", async () => {
    const cqlResult = await cql.parse(
      '"marina" (hyde OR abramovic) +section:commentisfree'
    );

    expect(cqlResult.queryResult).toBe(
      "q=marina%20OR%20(hyde%20OR%20abramovic)&section=commentisfree"
    );
  });

  it("should permit groups - 2", async () => {
    const cqlResult = await cql.parse(
      "(hyde OR abramovic) +section:commentisfree"
    );
    expect(cqlResult.queryResult).toBe(
      "q=(hyde%20OR%20abramovic)&section=commentisfree"
    );
  });

  it("should provide an error when keys are missing values", async () => {
    const cqlResult = await cql.parse("+tag");
    expect(cqlResult.error?.message).toBe(
      "The field 'tag' needs a value after it (e.g. 'tag:tone/news')"
    );
  });
});
