import { describe, expect, it } from "bun:test";
import { ok, Result, ResultKind } from "../utils/result";
import {
  createQueryBinary,
  createQueryContent,
  createQueryField,
  createQueryStr,
  createQueryGroup,
  createQuery,
  Query,
} from "./ast";
import {
  andToken,
  eofToken,
  leftParenToken,
  queryField,
  queryFieldKeyToken,
  queryValueToken,
  quotedStringToken,
  rightParenToken,
  unquotedStringToken,
} from "./testUtils";
import { Parser } from "./parser";
import { getPermutations } from "./utils";
import { Token, TokenType } from "./token";

describe("parser", () => {
  const assertFailure = (
    queryBinary: Result<Error, Query>,
    strContains: string
  ) => {
    switch (queryBinary.kind) {
      case ResultKind.Err: {
        expect(queryBinary.err.message).toContain(strContains);
        return;
      }
      default: {
        throw new Error("This should not parse");
      }
    }
  };

  describe("QueryList", () => {
    it("should handle an empty token list", () => {
      const tokens = [eofToken(0)];
      const result = new Parser(tokens).parse();
      expect(result).toEqual(ok(createQuery()));
    });
  });

  describe("QueryGroup", () => {
    it("should handle unmatched parenthesis", () => {
      const tokens = [leftParenToken(), eofToken(2)];
      const result = new Parser(tokens).parse();
      assertFailure(result, "Groups can't be empty");
    });

    it("should handle empty groups", () => {
      const tokens = [leftParenToken(), rightParenToken(1)];
      const result = new Parser(tokens).parse();
      assertFailure(result, "Groups can't be empty");
    });

    it("should handle groups with consecutive string tokens", () => {
      const tokens = [
        leftParenToken(),
        unquotedStringToken("a", 1),
        unquotedStringToken("b", 2),
        rightParenToken(3),
        eofToken(4),
      ];
      const result = new Parser(tokens).parse();
      expect(result).toEqual(
        ok(
          createQuery(
            createQueryBinary(
              createQueryContent(
                createQueryGroup(
                  createQueryBinary(
                    createQueryContent(
                      createQueryStr(unquotedStringToken("a", 1))
                    ),
                    [
                      new Token(TokenType.OR, "", undefined, 0, 0),
                      createQueryBinary(
                        createQueryContent(
                          createQueryStr(unquotedStringToken("b", 2))
                        )
                      ),
                    ]
                  )
                )
              )
            )
          )
        )
      );
    });
  });

  describe("QueryBoolean", () => {
    it("should handle an unbalanced boolean", () => {
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

    it("should handle a solo boolean operator", () => {
      const tokens = [andToken()];
      const result = new Parser(tokens).parse();
      assertFailure(
        result,
        "An AND keyword must have a search term before and after it, e.g. this AND that"
      );
    });
  });

  describe("QueryField", () => {
    it("should handle a query field", () => {
      const tokens = [
        queryFieldKeyToken("ta"),
        queryValueToken("", 3),
        eofToken(4),
      ];
      const result = new Parser(tokens).parse();
      expect(result).toEqual(
        ok(
          createQuery(
            createQueryBinary(createQueryContent(queryField("ta", "")))
          )
        )
      );
    });

    it("should handle a query field incorrectly nested in parentheses", () => {
      const tokens = [
        leftParenToken(),
        queryFieldKeyToken("tag", 1),
        eofToken(5),
      ];
      const result = new Parser(tokens).parse();
      assertFailure(
        result,
        `You cannot query for the field “tag” within a group`
      );
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
      assertFailure(result, `You cannot query for the field “tag” after 'AND'`);
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
          createQuery(
            createQueryBinary(
              createQueryContent(createQueryStr(quotedStringToken("a"))),
              [
                new Token(TokenType.OR, "", undefined, 0, 0),
                createQueryBinary(
                  createQueryContent(
                    createQueryField(queryFieldKeyToken("", 2), undefined)
                  ),
                  undefined
                ),
              ]
            )
          )
        )
      );
    });

    it("should handle a query value with no query key", () => {
      const tokens = [quotedStringToken("example"), queryValueToken("", 7)];
      const result = new Parser(tokens).parse();
      assertFailure(result, "unexpected ':'");
    });
  });

  it("should not crash on arbitrary tokens", () => {
    const tokens = [
      queryFieldKeyToken("tag"),
      queryValueToken("news"),
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