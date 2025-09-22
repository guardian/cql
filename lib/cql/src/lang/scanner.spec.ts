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

    expect(tokens).toEqual([
      ...expectedTokens,
      eofToken(tokens.at(-1)?.end ?? 0 + 1),
    ]);
  };

  const keyValuePair = (
    keyLexeme: string,
    keyLiteral: string,
    valueLexeme: string,
    valueLiteral: string | undefined,
    start: number = 1,
  ) => [
    new Token(
      TokenType.CHIP_KEY,
      keyLexeme,
      keyLiteral,
      start,
      keyLexeme.length + start - 1,
    ),
    new Token(
      TokenType.CHIP_VALUE,
      valueLexeme,
      valueLiteral,
      start + keyLexeme.length,
      start + keyLexeme.length + valueLexeme.length - 1,
    ),
  ];

  it("should parse an empty program", () => {
    assertTokens("", []);
  })

  describe("unquoted strings", () => {
    it("should parse plain strings", () => {
      assertTokens("sausages", [unquotedStringToken("sausages")]);
    });

    it("should preserve whitespace at the end of the document", () => {
      assertTokens("magnificent octopus ", [
        unquotedStringToken("magnificent"),
        unquotedStringToken("octopus ", 12),
      ]);
    });

    it("should preserve whitespace at the end of string tokens", () => {
      assertTokens("a  +tag", [
        unquotedStringToken("a "),
        new Token(TokenType.PLUS, "+", "+", 3, 3),
        new Token(TokenType.STRING, "tag", "tag", 4, 6),
      ]);
    });

    it("should interpret strings that start with reserved words as strings", () => {
      assertTokens("ORCOMBE", [unquotedStringToken("ORCOMBE")]);
    });
  });

  describe("quoted strings", () => {
    it("should parse plain strings", () => {
      assertTokens('"sausages"', [quotedStringToken("sausages")]);
    });

    it("should correctly handle escaped characters", () => {
      assertTokens(`\\"sausages\\"`, [
        unquotedStringToken(`\\"sausages\\"`, 0, `\\"sausages\\"`),
      ]);
    });

    it("should give a single token for strings separated with a space", () => {
      assertTokens('"magnificent octopus"', [
        quotedStringToken("magnificent octopus"),
      ]);
    });
  });

  describe("fields", () => {
    it("should tokenise a colon as a key", () => {
      assertTokens("+:", [
        new Token(TokenType.PLUS, "+", "+", 0, 0),
        new Token(TokenType.CHIP_KEY, ":", "", 1, 1),
      ]);
    });

    it("should tokenise keys for fields", () => {
      assertTokens("+tag:", [
        new Token(TokenType.PLUS, "+", "+", 0, 0),
        ...keyValuePair("tag:", "tag", "", undefined),
      ]);
    });

    it("should tokenise single-char keys and values", () => {
      assertTokens("+k:v", [
        new Token(TokenType.PLUS, "+", "+", 0, 0),
        ...keyValuePair("k:", "k", "v", "v"),
      ]);
    });

    it("should handle escaped characters in keys", () => {
      assertTokens("+tag\\::", [
        new Token(TokenType.PLUS, "+", "+", 0, 0),
        ...keyValuePair("tag\\::", "tag\\:", "", undefined),
      ]);
    });

    it("should handle escaped characters in values", () => {
      assertTokens("+tag\\::\\:", [
        new Token(TokenType.PLUS, "+", "+", 0, 0),
        ...keyValuePair("tag\\::", "tag\\:", "\\:", ":"),
      ]);
    });

    it("should tokenise minus to represent expressions with reversed polarity", () => {
      assertTokens("-tag:", [
        new Token(TokenType.MINUS, "-", "-", 0, 0),
        ...keyValuePair("tag:", "tag", "", undefined),
      ]);
    });

    it("should tokenise key value pairs for fields", () => {
      assertTokens("+tag:tone/news", [
        new Token(TokenType.PLUS, "+", "+", 0, 0),
        ...keyValuePair("tag:", "tag", "tone/news", "tone/news"),
      ]);
    });

    it("should tokenise consecutive fields", () => {
      assertTokens("+tag:tone/news +tag:tone/news", [
        new Token(TokenType.PLUS, "+", "+", 0, 0),
        ...keyValuePair("tag:", "tag", "tone/news", "tone/news"),
        new Token(TokenType.PLUS, "+", "+", 15, 15),
        ...keyValuePair("tag:", "tag", "tone/news", "tone/news", 16),
      ]);
    });

    it("should tokenise key value pairs for fields - 2", () => {
      assertTokens("+section:commentisfree", [
        new Token(TokenType.PLUS, "+", "+", 0, 0),
        ...keyValuePair(
          "section:",
          "section",
          "commentisfree",
          "commentisfree",
        ),
      ]);
    });

    describe("quoted keys and values", () => {
      it("should tokenise key value pairs for fields when the key is in quotes, with prefix", () => {
        assertTokens('+"Byline Title":"tone news"', [
          new Token(TokenType.PLUS, "+", "+", 0, 0),
          ...keyValuePair(
            `"Byline Title":`,
            "Byline Title",
            '"tone news"',
            "tone news",
          ),
        ]);
      });

      it("should tokenise key value pairs for fields when the key is in quotes, without prefix", () => {
        assertTokens('"Byline Title":"tone news"', [
          ...keyValuePair(
            `"Byline Title":`,
            "Byline Title",
            '"tone news"',
            "tone news",
            0,
          ),
        ]);
      });

      it("should tokenise key value pairs for fields when the value is in quotes", () => {
        assertTokens('+tag:"tone/news"', [
          new Token(TokenType.PLUS, "+", "+", 0, 0),
          ...keyValuePair("tag:", "tag", '"tone/news"', "tone/news"),
        ]);
      });

      it("should tokenise key value pairs for fields, and give `undefined` for empty quotes", () => {
        assertTokens('+tag:""', [
          new Token(TokenType.PLUS, "+", "+", 0, 0),
          ...keyValuePair("tag:", "tag", '""', undefined),
        ]);
      });
    });

    it("should tokenise key value pairs for fields when the key value contains non-word characters", () => {
      assertTokens('+@tag:"tone/news"', [
        new Token(TokenType.PLUS, "+", "+", 0, 0),
        ...keyValuePair("@tag:", "@tag", '"tone/news"', "tone/news"),
      ]);
    });

    it("should tokenise unprefixed key value pairs for fields when the key value contains non-word characters", () => {
      assertTokens('@tag.tag:"tone/news"', [
        ...keyValuePair("@tag.tag:", "@tag.tag", '"tone/news"', "tone/news", 0),
      ]);
    });

    it("should yield a plus token", () => {
      assertTokens("example +", [
        unquotedStringToken("example"),
        new Token(TokenType.PLUS, "+", "+", 8, 8),
      ]);
    });

    it("should yield a query field value token when a query value is incomplete", () => {
      assertTokens("example +tag:", [
        unquotedStringToken("example"),
        new Token(TokenType.PLUS, "+", "+", 8, 8),
        ...keyValuePair("tag:", "tag", "", undefined, 9),
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
      ]);
    });

    it("should tokenise groups and boolean operators - 2", () => {
      assertTokens("one AND two", [
        unquotedStringToken("one"),
        new Token(TokenType.AND, "AND", undefined, 4, 6),
        unquotedStringToken("two", 8),
      ]);
    });
  });

  describe("without field prefix", () => {
    it("should tokenise keys for fields", () => {
      assertTokens("tag:", [...keyValuePair("tag:", "tag", "", undefined, 0)]);
    });

    it("should tokenise key value pairs for fields, and give `undefined` for empty quotes,", () => {
      assertTokens('tag:""', [
        ...keyValuePair("tag:", "tag", '""', undefined, 0),
      ]);
    });

    it("should tokenise key value pairs for fields when the key value contains non-word characters", () => {
      assertTokens('@tag:"tone/news"', [
        ...keyValuePair("@tag:", "@tag", '"tone/news"', "tone/news", 0),
      ]);
    });

    it("should yield a query field value token when a query meta value is incomplete", () => {
      assertTokens("example tag:", [
        unquotedStringToken("example"),
        ...keyValuePair("tag:", "tag", "", undefined, 8),
      ]);
    });

    it("should tokenise key value pairs for fields when the key value is in quotes, containing whitespace and colon", () => {
      assertTokens('tag:"tone news:"', [
        ...keyValuePair("tag:", "tag", '"tone news:"', "tone news:", 0),
      ]);
    });

    it("should tokenise key value pairs for fields when the key value is in quotes, containing an escaped quote", () => {
      assertTokens('tag:"tone\\"news:"', [
        ...keyValuePair("tag:", "tag", '"tone\\"news:"', 'tone\\"news:', 0),
      ]);
    });

    it("should tokenise key value pairs for fields", () => {
      assertTokens("tag:tone/news", [
        ...keyValuePair("tag:", "tag", "tone/news", "tone/news", 0),
      ]);
    });
  });

  describe("settings", () => {
    describe("`groups: false`", () => {
      it("should disable groups, interpreting parentheses as strings", () => {
        assertTokens(
          "(two)",
          [unquotedStringToken("(two", 0), unquotedStringToken(")", 4)],
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
          [...keyValuePair("#", "tag", "tone/news", "tone/news", 0)],
          { shortcuts: { "#": "tag" } },
        );
      });
    });
  });
});
