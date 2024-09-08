import { describe, expect, it } from "bun:test";
import { ok, Result, ResultKind } from "../util/result";
import {
  createQueryList,
  createQueryBinary,
  createQueryContent,
  createQueryField,
  createQueryStr,
  QueryList,
} from "./ast";
import {
  andToken,
  colonToken,
  eofToken,
  leftParenToken,
  queryField,
  queryFieldKeyToken,
  queryOutputModifierKeyToken,
  queryValueToken,
  quotedStringToken,
  rightParenToken,
  unquotedStringToken,
} from "./testUtils";
import { Parser } from "./parser";
import { getPermutations } from "./util";
import { Token } from "./token";

describe("parser", () => {
  const assertFailure = (
    queryList: Result<Error, QueryList>,
    strContains: String
  ) => {
    switch (queryList.kind) {
      case ResultKind.Err: {
        expect(queryList.err.message).toContain(strContains);
        return;
      }
      default: {
        throw new Error("This should not parse");
      }
    }
  };

  it("should handle unmatched parenthesis", () => {
    const tokens = [leftParenToken(), eofToken(2)];
    const result = new Parser(tokens).parse();
    assertFailure(result, "Groups must contain some content");
  });

  it("should handle an empty token list", () => {
    const tokens = [eofToken(0)];
    const result = new Parser(tokens).parse();
    expect(result).toEqual(ok(createQueryList([])));
  });

  it("should handle a query field", () => {
    const tokens = [
      queryFieldKeyToken("ta"),
      queryValueToken("", 3),
      eofToken(4),
    ];
    const result = new Parser(tokens).parse();
    expect(result).toEqual(ok(createQueryList([queryField("ta", "")])));
  });

  it("should handle an unbalanced binary", () => {
    const tokens = [quotedStringToken("example"), andToken(7), eofToken(0)];
    const result = new Parser(tokens).parse();
    assertFailure(result, "There must be a query following 'AND'");
  });

  it("should handle an unbalanced binary within parenthesis", () => {
    const tokens = [
      leftParenToken(),
      quotedStringToken("example"),
      andToken(8),
      rightParenToken(9),
      eofToken(10),
    ];
    const result = new Parser(tokens).parse();
    assertFailure(result, "I didn't expect what I found after 'AND'");
  });

  it("should handle a query field incorrectly nested in parentheses", () => {
    const tokens = [
      leftParenToken(),
      queryFieldKeyToken("tag", 1),
      eofToken(5),
    ];
    const result = new Parser(tokens).parse();
    assertFailure(result, "You cannot query for tags within a group");
  });

  it("should handle a query field incorrectly following binary operators", () => {
    const tokens = [
      quotedStringToken("a"),
      andToken(1),
      queryFieldKeyToken("tag", 5),
      queryValueToken("b", 8),
      eofToken(10),
    ];
    const result = new Parser(tokens).parse();
    assertFailure(result, "You cannot query for tags after 'AND'");
  });

  it("should handle an empty query field key", () => {
    const tokens = [
      quotedStringToken("a"),
      queryFieldKeyToken("", 2),
      eofToken(5),
    ];
    const result = new Parser(tokens).parse();
    expect(result).toEqual(
      ok(
        createQueryList([
          createQueryBinary(createQueryContent(createQueryStr("a")), undefined),
          createQueryField(queryFieldKeyToken("", 2), undefined),
        ])
      )
    );
  });

  it("should handle a solo binary operator", () => {
    const tokens = [andToken()];
    const result = new Parser(tokens).parse();
    assertFailure(
      result,
      "An AND keyword must have a search term before and after it, e.g. this AND that"
    );
  });

  it("should handle empty groups", () => {
    const tokens = [leftParenToken(), rightParenToken(1)];
    const result = new Parser(tokens).parse();
    assertFailure(result, "Groups must contain some content.");
  });

  it("should handle a query value with no query key", () => {
    const tokens = [quotedStringToken("example"), queryValueToken("", 7)];
    const result = new Parser(tokens).parse();
    assertFailure(result, "unexpected ':'");
  });

  it("should handle a colon with no query key after another query", () => {
    const tokens = [
      queryFieldKeyToken("tag", 5),
      queryValueToken("news", 8),
      colonToken(13),
      eofToken(14),
    ];
    const result = new Parser(tokens).parse();
    assertFailure(result, "unexpected ':'");
  });

  it("should not crash on arbitrary tokens", () => {
    const tokens = [
      queryFieldKeyToken("tag"),
      queryValueToken("news"),
      queryOutputModifierKeyToken("show-fields"),
      queryValueToken("all"),
      colonToken(13),
      andToken(1),
      leftParenToken(),
      quotedStringToken("sausages"),
      rightParenToken(1),
      unquotedStringToken("eggs"),
      eofToken(14),
    ];

    const tokenPermutations: Token[][] = [];
    const generator = getPermutations(tokens);

    for (let i = 0; i < 1000; i++) {
      const next = generator.next();
      if (!next.done) {
        tokenPermutations.push(next.value);
      }
    }

    tokenPermutations.map((tokens) => new Parser(tokens).parse());

    // No crash
    expect(true).toBe(true);
  });
});
