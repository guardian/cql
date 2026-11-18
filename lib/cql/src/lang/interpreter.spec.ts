import { describe, expect, it } from "bun:test";
import { createParser } from "./Cql";
import { cqlQueryStrFromQueryAst } from "./interpreter";

describe("interpreter", () => {
  const parser = createParser();
  it("should normalise complex queries", () => {
    const firstQuery = parser(
      `  +: "marina" +section:commentisfree "Byline Title":"John Doe"`,
    ).queryAst!;
    const secondQuery = parser(
      `+: marina +section:"commentisfree" +"Byline Title":"John Doe"`,
    ).queryAst!;

    const firstStr = cqlQueryStrFromQueryAst(firstQuery);
    const secondStr = cqlQueryStrFromQueryAst(secondQuery);

    expect(firstStr).toBe(secondStr);
  });

  it("should escape reserved characters in quoted strings", () => {
    const queryStr = `"\\"saus\\" \\"age\\""`;
    const query = parser(queryStr).queryAst!;

    const str = cqlQueryStrFromQueryAst(query);

    expect(str).toBe(queryStr);
  });

  it("should quote a plain string containing a reserved char (colon)", () => {
    const queryStr = `"hello:world"`;
    const query = parser(queryStr).queryAst!;

    const str = cqlQueryStrFromQueryAst(query);

    expect(str).toBe(queryStr);
  });

  it("should quote a plain string containing a reserved char (parens)", () => {
    const queryStr = `"(parenthetical)"`;
    const query = parser(queryStr).queryAst!;

    const str = cqlQueryStrFromQueryAst(query);

    expect(str).toBe(queryStr);
  });

  it("should not quote a plain string with no reserved chars or whitespace", () => {
    const queryStr = `hello`;
    const query = parser(queryStr).queryAst!;

    const str = cqlQueryStrFromQueryAst(query);

    expect(str).toBe(queryStr);
  });

  it("should escape reserved characters in chip keys and values", () => {
    const queryStr = `key:"\\"value\\""`;
    const query = parser(queryStr).queryAst!;

    const str = cqlQueryStrFromQueryAst(query);

    expect(str).toBe(queryStr);
  });
});
