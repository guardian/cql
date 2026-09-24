import { describe, expect, it } from "bun:test";
import { ok, Result, ResultKind } from "../utils/result";
import {
  CqlBinary,
  CqlField,
  CqlStr,
  CqlGroup,
  CqlQuery,
  CqlUnary,
} from "./ast";
import {
  andToken,
  eofToken,
  leftParenToken,
  minusToken,
  orToken,
  plusToken,
  queryField,
  queryFieldKeyToken,
  queryValueToken as queryFieldValueToken,
  quotedStringToken,
  rightParenToken,
  unquotedStringToken,
} from "./testUtils";
import { Parser } from "./parser";
import { getPermutations } from "./utils";
import { Token, TokenType } from "./token";

describe("parser", () => {
  const assertFailure = (
    queryBinary: Result<Error, CqlQuery>,
    strContains: string,
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
      expect(result).toEqual(ok(new CqlQuery()));
    });
  });

  describe("CqlGroup", () => {
    it("should handle unmatched parenthesis - lhs", () => {
      const tokens = [leftParenToken(), eofToken(2)];
      const result = new Parser(tokens).parse();
      assertFailure(result, "Groups can't be empty");
    });

    it("should handle unmatched parenthesis - rhs, first token", () => {
      const tokens = [rightParenToken(), eofToken(2)];
      const result = new Parser(tokens).parse();
      assertFailure(result, "I didn't expect to find a `)` here.");
    });

    it("should handle unmatched parenthesis - rhs, subsequent tokens", () => {
      const tokens = [
        unquotedStringToken("a"),
        rightParenToken(1),
        eofToken(2),
      ];
      const result = new Parser(tokens).parse();
      assertFailure(result, "I didn't expect to find a `)` after `a`");
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
          new CqlQuery(
            new CqlBinary(
              new CqlUnary(
                new CqlGroup(
                  new CqlBinary(
                    new CqlUnary(new CqlStr(unquotedStringToken("a", 1))),
                    {
                      operator: { tokenType: TokenType.OR, lexeme: "" },
                      expr: new CqlUnary(new CqlStr(unquotedStringToken("b", 2)))
                    }
                  )
                )
              ))
          )
        )
      );
    });
  });

  describe("CqlBinary", () => {
    it("should bind OR on the left hand side", () => {
      const tokens = [unquotedStringToken("1"), orToken(7), unquotedStringToken("2", 10), andToken(11), unquotedStringToken("3", 14), eofToken(15)];
      const result = new Parser(tokens).parse();
      expect(result).toEqual(
        ok(
          new CqlQuery(
            new CqlBinary(
              new CqlUnary(new CqlStr(unquotedStringToken("1"))),
              {
                operator: { tokenType: TokenType.OR, lexeme: "OR" },
                expr: new CqlBinary(
                  new CqlUnary(new CqlStr(unquotedStringToken("2", 10))),
                  {
                    operator: { tokenType: TokenType.AND, lexeme: "AND" },
                    expr: new CqlUnary(
                      new CqlStr(unquotedStringToken("3", 14))
                    )
                  }
                ),
              }
            )
          )
        )
      )
    });

    it("should bind AND on the right hand side", () => {
      const tokens = [unquotedStringToken("1"), andToken(7), unquotedStringToken("2", 11), orToken(12), unquotedStringToken("3", 14), eofToken(15)];
      const result = new Parser(tokens).parse();
      expect(result).toEqual(
        ok(
          new CqlQuery(
            new CqlBinary(
              new CqlBinary(
                new CqlUnary(new CqlStr(unquotedStringToken("1"))),
                {
                  operator: { tokenType: TokenType.AND, lexeme: "AND" },
                  expr: new CqlUnary(new CqlStr(unquotedStringToken("2", 11))),
                }
              ), {
              operator: { tokenType: TokenType.OR, lexeme: "OR" },
              expr: new CqlUnary(
                new CqlStr(unquotedStringToken("3", 14))
              )
            },
            )
          )
        )
      )
    });

    it("should handle an unbalanced boolean", () => {
      const tokens = [quotedStringToken("example"), andToken(7), eofToken(0)];
      const result = new Parser(tokens).parse();
      assertFailure(result, "There must be a query following `AND`");
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
      assertFailure(result, "I didn't expect to find a `)` after `AND`");
    });

    it("should handle a solo boolean operator", () => {
      const tokens = [andToken()];
      const result = new Parser(tokens).parse();
      assertFailure(
        result,
        "An `AND` keyword must have a search term before and after it, e.g. `this AND that`",
      );
    });
  });

  describe("QueryField", () => {
    it("should handle a query field without a value", () => {
      const tokens = [
        plusToken(0),
        queryFieldKeyToken("", 1),
        eofToken(4),
      ];
      const result = new Parser(tokens).parse();
      expect(result).toEqual(
        ok(new CqlQuery(new CqlBinary(new CqlUnary(queryField("", undefined, 1)))))
      )
    });

    it("should handle a query field", () => {
      const tokens = [
        queryFieldKeyToken("ta"),
        queryFieldValueToken("", 3),
        eofToken(4),
      ];
      const result = new Parser(tokens).parse();
      expect(result).toEqual(
        ok(new CqlQuery(new CqlBinary(new CqlUnary(queryField("ta", ""))))),
      );
    });

    it("should handle a query field with a negation", () => {
      const tokens = [
        minusToken(),
        queryFieldKeyToken("ta"),
        queryFieldValueToken("", 3),
        eofToken(4),
      ];
      const result = new Parser(tokens).parse();
      expect(result).toEqual(
        ok(
          new CqlQuery(
            new CqlBinary(new CqlUnary(queryField("ta", ""), "NEGATIVE")),
          ),
        ),
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
        "You cannot query for the field `tag` within a group",
      );
    });

    it("should handle a query field incorrectly following binary operators", () => {
      const tokens = [
        quotedStringToken("a"),
        andToken(1),
        queryFieldKeyToken("tag", 5),
        queryFieldValueToken("b", 8),
        eofToken(10),
      ];
      const result = new Parser(tokens).parse();
      assertFailure(result, "You cannot query for the field `tag` after `AND`");
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
          new CqlQuery(
            new CqlBinary(
              new CqlUnary(new CqlStr(quotedStringToken("a"))),
              {
                operator: {
                  tokenType: TokenType.OR,
                  lexeme: ""
                },
                expr: new CqlUnary(new CqlField(queryFieldKeyToken("", 2), undefined))
              },
            ),

          )
        ),
      );
    });

    it("should handle a query value with no query key", () => {
      const tokens = [
        quotedStringToken("example"),
        queryFieldValueToken("", 7),
      ];
      const result = new Parser(tokens).parse();
      assertFailure(result, "I didn't expect to find a `:` after `\"example\"`");
    });
  });

  it("should not crash on arbitrary tokens", () => {
    const tokens = [
      queryFieldKeyToken("tag"),
      queryFieldValueToken("news"),
      andToken(1),
      leftParenToken(),
      orToken(),
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
