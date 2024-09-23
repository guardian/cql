import { describe, expect, it } from "bun:test";
import { Scanner } from "./scanner";
import { eofToken, quotedStringToken, unquotedStringToken } from "./testUtils";
import { Token, TokenType } from "./token";

describe("scanner", () => {
  describe("unquoted strings", () => {
    it("should parse plain strings", () => {
      const scanner = new Scanner("sausages");
      const tokens = scanner.scanTokens();
      const expectedTokens = [unquotedStringToken("sausages"), eofToken(8)];
      expect(tokens).toEqual(expectedTokens);
    });

    it("should give single tokens for strings separated with a space - 1", () => {
      const scanner = new Scanner("magnificent octopus");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        unquotedStringToken("magnificent octopus"),
        eofToken(19),
      ];
      expect(tokens).toEqual(expectedTokens);
    });

    it("should preserve whitespace at the end of the document", () => {
      const scanner = new Scanner("magnificent octopus ");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        unquotedStringToken("magnificent octopus "),
        eofToken(20),
      ];
      expect(tokens).toEqual(expectedTokens);
    });

    it("should preserve whitespace at the end of string tokens", () => {
      const scanner = new Scanner("a  +tag");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        unquotedStringToken("a "),
        new Token(TokenType.QUERY_FIELD_KEY, "+tag", "tag", 3, 6),
        eofToken(7),
      ];
      expect(tokens).toEqual(expectedTokens);
    });
  });

  describe("quoted strings", () => {
    it("should parse plain strings", () => {
      const scanner = new Scanner("\"sausages\"");
      const tokens = scanner.scanTokens();
      const expectedTokens = [quotedStringToken("sausages"), eofToken(10)];
      expect(tokens).toEqual(expectedTokens);
    });

    it("should give a single token for strings separated with a space", () => {
      const scanner = new Scanner("\"magnificent octopus\"");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        quotedStringToken("magnificent octopus"),
        eofToken(21),
      ];

      expect(tokens).toEqual(expectedTokens);
    });
  });

  describe("search params", () => {
    it("should tokenise key value pairs for fields", () => {
      const scanner = new Scanner("+tag:");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        new Token(TokenType.QUERY_FIELD_KEY, "+tag", "tag", 0, 3),
        new Token(TokenType.QUERY_VALUE, ":", undefined, 4, 4),
        eofToken(5),
      ];

      expect(tokens).toEqual(expectedTokens);
    });

    it("should tokenise key value pairs for fields", () => {
      const scanner = new Scanner("+tag:tone/news");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        new Token(TokenType.QUERY_FIELD_KEY, "+tag", "tag", 0, 3),
        new Token(TokenType.QUERY_VALUE, ":tone/news", "tone/news", 4, 13),
        eofToken(14),
      ];

      expect(tokens).toEqual(expectedTokens);
    });

    it("should tokenise key value pairs for fields - 2", () => {
      const scanner = new Scanner("+section:commentisfree");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        new Token(TokenType.QUERY_FIELD_KEY, "+section", "section", 0, 7),
        new Token(
          TokenType.QUERY_VALUE,
          ":commentisfree",
          "commentisfree",
          8,
          21
        ),
        eofToken(22),
      ];

      expect(tokens).toEqual(expectedTokens);
    });

    it("should yield a query field key when a search key is incomplete", () => {
      const scanner = new Scanner("example +");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        unquotedStringToken("example"),
        new Token(TokenType.QUERY_FIELD_KEY, "+", undefined, 8, 8),
        eofToken(9),
      ];
      expect(tokens).toEqual(expectedTokens);
    });

    it("should yield a query field value token when a query meta value is incomplete", () => {
      const scanner = new Scanner("example +tag:");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        unquotedStringToken("example"),
        new Token(TokenType.QUERY_FIELD_KEY, "+tag", "tag", 8, 11),
        new Token(TokenType.QUERY_VALUE, ":", undefined, 12, 12),
        eofToken(13),
      ];
      expect(tokens).toEqual(expectedTokens);
    });

    it("should tokenise groups and boolean operators - 1", () => {
      const scanner = new Scanner("one AND (two OR three)");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        unquotedStringToken("one"),
        new Token(TokenType.AND, "AND", undefined, 4, 6),
        new Token(TokenType.LEFT_BRACKET, "(", undefined, 8, 8),
        unquotedStringToken("two", 9),
        new Token(TokenType.OR, "OR", undefined, 13, 14),
        unquotedStringToken("three", 16),
        new Token(TokenType.RIGHT_BRACKET, ")", undefined, 21, 21),
        eofToken(22),
      ];
      expect(tokens).toEqual(expectedTokens);
    });

    it("should tokenise groups and boolean operators - 2", () => {
      const scanner = new Scanner("one AND two three");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        unquotedStringToken("one"),
        new Token(TokenType.AND, "AND", undefined, 4, 6),
        unquotedStringToken("two three", 8),
        eofToken(17),
      ];

      expect(tokens).toEqual(expectedTokens);
    });

    it("should tokenise groups", () => {
      const scanner = new Scanner("(two OR three)");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        new Token(TokenType.LEFT_BRACKET, "(", undefined, 0, 0),
        unquotedStringToken("two", 1),
        new Token(TokenType.OR, "OR", undefined, 5, 6),
        unquotedStringToken("three", 8),
        new Token(TokenType.RIGHT_BRACKET, ")", undefined, 13, 13),
        eofToken(14),
      ];
      expect(tokens).toEqual(expectedTokens);
    });
  });
});
