import { describe, expect, it } from "bun:test";
import { parseCqlStr } from "./Cql";
import { cqlQueryStrFromQueryAst } from "./interpreter";

describe("interpreter", () => {
  it("should normalise complex queries", () => {
    const firstQuery = parseCqlStr(
      `  +: "marina" +section:commentisfree `,
    ).queryAst!;
    const secondQuery = parseCqlStr(
      `+: marina +section:"commentisfree"`,
    ).queryAst!;

    const firstStr = cqlQueryStrFromQueryAst(firstQuery);
    const secondStr = cqlQueryStrFromQueryAst(secondQuery);

    expect(firstStr).toBe(secondStr);
  });
});
