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

    it("should preserve whitespace at the end of the document", () => {
      const scanner = new Scanner("magnificent octopus ");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        unquotedStringToken("magnificent"),
        unquotedStringToken("octopus ", 12),
        eofToken(20),
      ];
      expect(tokens).toEqual(expectedTokens);
    });

    it("should preserve whitespace at the end of string tokens", () => {
      const scanner = new Scanner("a  +tag");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        unquotedStringToken("a "),
        new Token(TokenType.CHIP_KEY_POSITIVE, "+tag", "tag", 3, 6),
        eofToken(7),
      ];
      expect(tokens).toEqual(expectedTokens);
    });

    it("should interpret strings that start with reserved words as strings", () => {
      const scanner = new Scanner("ORCOMBE");
      const tokens = scanner.scanTokens();
      const expectedTokens = [unquotedStringToken("ORCOMBE"), eofToken(7)];
      expect(tokens).toEqual(expectedTokens);
    });
  });

  describe("quoted strings", () => {
    it("should parse plain strings", () => {
      const scanner = new Scanner('"sausages"');
      const tokens = scanner.scanTokens();
      const expectedTokens = [quotedStringToken("sausages"), eofToken(10)];
      expect(tokens).toEqual(expectedTokens);
    });

    it("should give a single token for strings separated with a space", () => {
      const scanner = new Scanner('"magnificent octopus"');
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        quotedStringToken("magnificent octopus"),
        eofToken(21),
      ];

      expect(tokens).toEqual(expectedTokens);
    });
  });

  describe("fields", () => {
    it("should tokenise keys for fields", () => {
      const scanner = new Scanner("+tag:");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        new Token(TokenType.CHIP_KEY_POSITIVE, "+tag", "tag", 0, 3),
        new Token(TokenType.CHIP_VALUE, ":", undefined, 4, 4),
        eofToken(5),
      ];

      expect(tokens).toEqual(expectedTokens);
    });

    it("should tokenise keys for fields with reversed polarity", () => {
      const scanner = new Scanner("-tag:");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        new Token(TokenType.CHIP_KEY_NEGATIVE, "-tag", "tag", 0, 3),
        new Token(TokenType.CHIP_VALUE, ":", undefined, 4, 4),
        eofToken(5),
      ];

      expect(tokens).toEqual(expectedTokens);
    });

    it("should tokenise key value pairs for fields", () => {
      const scanner = new Scanner("+tag:tone/news");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        new Token(TokenType.CHIP_KEY_POSITIVE, "+tag", "tag", 0, 3),
        new Token(TokenType.CHIP_VALUE, ":tone/news", "tone/news", 4, 13),
        eofToken(14),
      ];

      expect(tokens).toEqual(expectedTokens);
    });

    it("should tokenise key value pairs for fields - 2", () => {
      const scanner = new Scanner("+section:commentisfree");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        new Token(TokenType.CHIP_KEY_POSITIVE, "+section", "section", 0, 7),
        new Token(
          TokenType.CHIP_VALUE,
          ":commentisfree",
          "commentisfree",
          8,
          21,
        ),
        eofToken(22),
      ];

      expect(tokens).toEqual(expectedTokens);
    });

    it("should tokenise key value pairs for fields when the key value is in quotes", () => {
      const scanner = new Scanner('+tag:"tone/news"');
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        new Token(TokenType.CHIP_KEY_POSITIVE, "+tag", "tag", 0, 3),
        new Token(TokenType.CHIP_VALUE, ':"tone/news"', "tone/news", 4, 15),
        eofToken(16),
      ];

      expect(tokens).toEqual(expectedTokens);
    });

    it("should tokenise key value pairs for fields, and give `undefined` for empty quotes", () => {
      const scanner = new Scanner('+tag:""');
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        new Token(TokenType.CHIP_KEY_POSITIVE, "+tag", "tag", 0, 3),
        new Token(TokenType.CHIP_VALUE, ':""', undefined, 4, 6),
        eofToken(7),
      ];

      expect(tokens).toEqual(expectedTokens);
    });

    it("should tokenise key value pairs for fields when the key value contains non-word characters", () => {
      const scanner = new Scanner('+@tag:"tone/news"');
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        new Token(TokenType.CHIP_KEY_POSITIVE, "+@tag", "@tag", 0, 4),
        new Token(TokenType.CHIP_VALUE, ':"tone/news"', "tone/news", 5, 16),
        eofToken(17),
      ];

      expect(tokens).toEqual(expectedTokens);
    });

    it("should yield a query field key when a search key is incomplete", () => {
      const scanner = new Scanner("example +");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        unquotedStringToken("example"),
        new Token(TokenType.CHIP_KEY_POSITIVE, "+", undefined, 8, 8),
        eofToken(9),
      ];
      expect(tokens).toEqual(expectedTokens);
    });

    it("should yield a query field value token when a query meta value is incomplete", () => {
      const scanner = new Scanner("example +tag:");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        unquotedStringToken("example"),
        new Token(TokenType.CHIP_KEY_POSITIVE, "+tag", "tag", 8, 11),
        new Token(TokenType.CHIP_VALUE, ":", undefined, 12, 12),
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
      const scanner = new Scanner("one AND two");
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        unquotedStringToken("one"),
        new Token(TokenType.AND, "AND", undefined, 4, 6),
        unquotedStringToken("two", 8),
        eofToken(11),
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

  describe("settings", () => {
    it("should disable groups, interpreting parentheses as strings", () => {
      const scanner = new Scanner("(two)", { groups: false });
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        unquotedStringToken("(two", 0),
        unquotedStringToken(")", 4),
        eofToken(5),
      ];
      expect(tokens).toEqual(expectedTokens);
    });

    it("should disable operators, interpreting them as strings", () => {
      const scanner = new Scanner("this AND that", { operators: false });
      const tokens = scanner.scanTokens();
      const expectedTokens = [
        unquotedStringToken("this", 0),
        unquotedStringToken("AND", 5),
        unquotedStringToken("that", 9),
        eofToken(13),
      ];
      expect(tokens).toEqual(expectedTokens);
    });
  });
});
