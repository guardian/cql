import { describe, expect, it } from "bun:test";
import { Scanner, ScannerSettings } from "./scanner";
import { eofToken, quotedStringToken, unquotedStringToken } from "./testUtils";
import { Token, TokenType } from "./token";

describe("scanner", () => {
  const assertTokens = (
    query: string,
    expectedTokens: Token[],
    settings?: Partial<ScannerSettings>,
  ) => {
    const scanner = new Scanner(query, settings);
    const tokens = scanner.scanTokens();

    expect(tokens).toEqual(expectedTokens);
  };

  describe("unquoted strings", () => {
    it("should parse plain strings", () => {
      assertTokens("sausages", [unquotedStringToken("sausages"), eofToken(8)]);
    });

    it("should preserve whitespace at the end of the document", () => {
      assertTokens("magnificent octopus ", [
        unquotedStringToken("magnificent"),
        unquotedStringToken("octopus ", 12),
        eofToken(20),
      ]);
    });

    it("should preserve whitespace at the end of string tokens", () => {
      assertTokens("a  +tag", [
        unquotedStringToken("a "),
        new Token(TokenType.CHIP_KEY_POSITIVE, "+tag", "tag", 3, 6),
        eofToken(7),
      ]);
    });

    it("should interpret strings that start with reserved words as strings", () => {
      assertTokens("ORCOMBE", [unquotedStringToken("ORCOMBE"), eofToken(7)]);
    });
  });

  describe("quoted strings", () => {
    it("should parse plain strings", () => {
      assertTokens('"sausages"', [quotedStringToken("sausages"), eofToken(10)]);
    });

    it("should give a single token for strings separated with a space", () => {
      assertTokens('"magnificent octopus"', [
        quotedStringToken("magnificent octopus"),
        eofToken(21),
      ]);
    });
  });

  describe("fields", () => {
    it("should tokenise keys for fields", () => {
      assertTokens("+tag:", [
        new Token(TokenType.CHIP_KEY_POSITIVE, "+tag", "tag", 0, 3),
        new Token(TokenType.CHIP_VALUE, ":", undefined, 4, 4),
        eofToken(5),
      ]);
    });

    it("should tokenise keys for fields with reversed polarity", () => {
      assertTokens("-tag:", [
        new Token(TokenType.CHIP_KEY_NEGATIVE, "-tag", "tag", 0, 3),
        new Token(TokenType.CHIP_VALUE, ":", undefined, 4, 4),
        eofToken(5),
      ]);
    });

    it("should tokenise key value pairs for fields", () => {
      assertTokens("+tag:tone/news", [
        new Token(TokenType.CHIP_KEY_POSITIVE, "+tag", "tag", 0, 3),
        new Token(TokenType.CHIP_VALUE, ":tone/news", "tone/news", 4, 13),
        eofToken(14),
      ]);
    });

    it("should tokenise key value pairs for fields - 2", () => {
      assertTokens("+section:commentisfree", [
        new Token(TokenType.CHIP_KEY_POSITIVE, "+section", "section", 0, 7),
        new Token(
          TokenType.CHIP_VALUE,
          ":commentisfree",
          "commentisfree",
          8,
          21,
        ),
        eofToken(22),
      ]);
    });

    it("should tokenise key value pairs for fields when the key is in quotes, with prefix", () => {
      assertTokens('+"Byline Title":"tone news"', [
        new Token(TokenType.CHIP_KEY_POSITIVE, `+"Byline Title"`, "Byline Title", 0, 14),
        new Token(TokenType.CHIP_VALUE, ':"tone news"', "tone news", 15, 26),
        eofToken(27),
      ]);
    });

    it("should tokenise key value pairs for fields when the key is in quotes, without prefix", () => {
      assertTokens('"Byline Title":"tone news"', [
        new Token(TokenType.CHIP_KEY_POSITIVE, `"Byline Title"`, "Byline Title", 0, 13),
        new Token(TokenType.CHIP_VALUE, ':"tone news"', "tone news", 14, 25),
        eofToken(26),
      ]);
    });

    it("should tokenise key value pairs for fields when the value is in quotes", () => {
      assertTokens('+tag:"tone/news"', [
        new Token(TokenType.CHIP_KEY_POSITIVE, "+tag", "tag", 0, 3),
        new Token(TokenType.CHIP_VALUE, ':"tone/news"', "tone/news", 4, 15),
        eofToken(16),
      ]);
    });

    it("should tokenise key value pairs for fields, and give `undefined` for empty quotes", () => {
      assertTokens('+tag:""', [
        new Token(TokenType.CHIP_KEY_POSITIVE, "+tag", "tag", 0, 3),
        new Token(TokenType.CHIP_VALUE, ':""', undefined, 4, 6),
        eofToken(7),
      ]);
    });

    it("should tokenise key value pairs for fields when the key value contains non-word characters", () => {
      assertTokens('+@tag:"tone/news"', [
        new Token(TokenType.CHIP_KEY_POSITIVE, "+@tag", "@tag", 0, 4),
        new Token(TokenType.CHIP_VALUE, ':"tone/news"', "tone/news", 5, 16),
        eofToken(17),
      ]);
    });

    it("should tokenise unprefixed key value pairs for fields when the key value contains non-word characters", () => {
      assertTokens('@tag.tag:"tone/news"', [
        new Token(TokenType.CHIP_KEY_POSITIVE, "@tag.tag", "@tag.tag", 0, 7),
        new Token(TokenType.CHIP_VALUE, ':"tone/news"', "tone/news", 8, 19),
        eofToken(20),
      ]);
    });

    it("should yield a query field key when a search key is incomplete", () => {
      assertTokens("example +", [
        unquotedStringToken("example"),
        new Token(TokenType.CHIP_KEY_POSITIVE, "+", undefined, 8, 8),
        eofToken(9),
      ]);
    });

    it("should yield a query field value token when a query meta value is incomplete", () => {
      assertTokens("example +tag:", [
        unquotedStringToken("example"),
        new Token(TokenType.CHIP_KEY_POSITIVE, "+tag", "tag", 8, 11),
        new Token(TokenType.CHIP_VALUE, ":", undefined, 12, 12),
        eofToken(13),
      ]);
    });
  });

  describe("groups", () => {
    it("should tokenise groups", () => {
      assertTokens("(two OR three)", [
        new Token(TokenType.LEFT_BRACKET, "(", undefined, 0, 0),
        unquotedStringToken("two", 1),
        new Token(TokenType.OR, "OR", undefined, 5, 6),
        unquotedStringToken("three", 8),
        new Token(TokenType.RIGHT_BRACKET, ")", undefined, 13, 13),
        eofToken(14),
      ]);
    });

    it("should tokenise groups and boolean operators - 1", () => {
      assertTokens("one AND (two OR three)", [
        unquotedStringToken("one"),
        new Token(TokenType.AND, "AND", undefined, 4, 6),
        new Token(TokenType.LEFT_BRACKET, "(", undefined, 8, 8),
        unquotedStringToken("two", 9),
        new Token(TokenType.OR, "OR", undefined, 13, 14),
        unquotedStringToken("three", 16),
        new Token(TokenType.RIGHT_BRACKET, ")", undefined, 21, 21),
        eofToken(22),
      ]);
    });

    it("should tokenise groups and boolean operators - 2", () => {
      assertTokens("one AND two", [
        unquotedStringToken("one"),
        new Token(TokenType.AND, "AND", undefined, 4, 6),
        unquotedStringToken("two", 8),
        eofToken(11),
      ]);
    });
  });

  describe("without field prefix", () => {
    it("should tokenise keys for fields", () => {
      assertTokens("tag:", [
        new Token(TokenType.CHIP_KEY_POSITIVE, "tag", "tag", 0, 2),
        new Token(TokenType.CHIP_VALUE, ":", undefined, 3, 3),
        eofToken(4),
      ]);
    });

    it("should tokenise key value pairs for fields, and give `undefined` for empty quotes,", () => {
      assertTokens('tag:""', [
        new Token(TokenType.CHIP_KEY_POSITIVE, "tag", "tag", 0, 2),
        new Token(TokenType.CHIP_VALUE, ':""', undefined, 3, 5),
        eofToken(6),
      ]);
    });

    it("should tokenise key value pairs for fields when the key value contains non-word characters", () => {
      assertTokens('@tag:"tone/news"', [
        new Token(TokenType.CHIP_KEY_POSITIVE, "@tag", "@tag", 0, 3),
        new Token(TokenType.CHIP_VALUE, ':"tone/news"', "tone/news", 4, 15),
        eofToken(16),
      ]);
    });

    it("should yield a query field value token when a query meta value is incomplete", () => {
      assertTokens("example tag:", [
        unquotedStringToken("example"),
        new Token(TokenType.CHIP_KEY_POSITIVE, "tag", "tag", 8, 10),
        new Token(TokenType.CHIP_VALUE, ":", undefined, 11, 11),
        eofToken(12),
      ]);
    });

    it("should tokenise key value pairs for fields when the key value is in quotes, containing whitespace and colon", () => {
      assertTokens('tag:"tone news:"', [
        new Token(TokenType.CHIP_KEY_POSITIVE, "tag", "tag", 0, 2),
        new Token(TokenType.CHIP_VALUE, ':"tone news:"', "tone news:", 3, 15),
        eofToken(16),
      ]);
    });

    it("should tokenise key value pairs for fields", () => {
      assertTokens("tag:tone/news", [
        new Token(TokenType.CHIP_KEY_POSITIVE, "tag", "tag", 0, 2),
        new Token(TokenType.CHIP_VALUE, ":tone/news", "tone/news", 3, 12),
        eofToken(13),
      ]);
    });
  });

  describe("settings", () => {
    describe("`groups: false`", () => {
      it("should disable groups, interpreting parentheses as strings", () => {
        assertTokens(
          "(two)",
          [
            unquotedStringToken("(two", 0),
            unquotedStringToken(")", 4),
            eofToken(5),
          ],
          { groups: false },
        );
      });
    });

    describe("`operators: false`", () => {
      it("should disable operators, interpreting them as strings", () => {
        assertTokens(
          "this AND that",
          [
            unquotedStringToken("this", 0),
            unquotedStringToken("AND", 5),
            unquotedStringToken("that", 9),
            eofToken(13),
          ],
          { operators: false },
        );
      });
    });

    describe("shortcuts", () => {
      it("should throw an error when a shortcut conflicts with a reserved character", () => {
        const shouldThrow = () =>
          new Scanner("", { shortcuts: { "(": "invalid" } });

        expect(shouldThrow).toThrow();
      });

      it("should throw an error when a shortcut is more than a single character long", () => {
        const shouldThrow = () =>
          new Scanner("", { shortcuts: { aa: "invalid" } });

        expect(shouldThrow).toThrow();
      });

      it("parse a shortcut followed by a chip value", () => {
        assertTokens(
          "#tone/news",
          [
            new Token(TokenType.CHIP_KEY_POSITIVE, "#", "tag", 0, 0),
            new Token(TokenType.CHIP_VALUE, "#tone/news", "tone/news", 0, 9),
            eofToken(10),
          ],
          { shortcuts: { "#": "tag" } },
        );
      });
    });
  });
});
