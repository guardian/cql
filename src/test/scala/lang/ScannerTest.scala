package cql.lang

import TokenType.*

class ScannerTest extends BaseTest {
  def assertTokens(
      query: String,
      expected: List[Token],
      settings: ScannerSettings = ScannerSettings()
  ) =
    val tokens = Scanner.scan(query, settings)
    tokens shouldBe (expected :+ eofToken(query.length))

  def keyValuePair(
      keyLexeme: String,
      keyLiteral: String,
      valueLexeme: Option[String] = None,
      valueLiteral: Option[String] = None,
      start: Int = 1
  ): List[Token] =
    Token(
      CHIP_KEY,
      keyLexeme,
      Some(keyLiteral),
      start,
      start + keyLexeme.length - 1
    ) ::
      valueLexeme.map { vl =>
        Token(
          CHIP_VALUE,
          vl,
          valueLiteral,
          start + keyLexeme.length,
          start + keyLexeme.length + vl.length - 1
        )
      }.toList

  it("should parse an empty program") {
    assertTokens("", List.empty)
  }

  describe("unquoted strings") {
    it("should parse plain strings") {
      assertTokens("sausages", List(unquotedStringToken("sausages")))
    }

    it("should preserve whitespace at the end of the document") {
      assertTokens(
        "magnificent octopus ",
        List(
          unquotedStringToken("magnificent"),
          unquotedStringToken("octopus ", 12)
        )
      )
    }

    it("should preserve whitespace at the end of string tokens") {
      assertTokens(
        "a  +tag",
        List(
          unquotedStringToken("a "),
          Token(PLUS, "+", Some("+"), 3, 3),
          Token(STRING, "tag", Some("tag"), 4, 6)
        )
      )
    }

    it(
      "should interpret strings that start with reserved words as strings"
    ) {
      assertTokens("ORCOMBE", List(unquotedStringToken("ORCOMBE")))
    }
  }

  describe("quoted strings") {
    it("should parse plain strings") {
      assertTokens("\"sausages\"", List(quotedStringToken("sausages")))
    }

    it("should correctly handle escaped characters") {
      assertTokens(
        "\\\"sausages\\\"",
        List(
          Token(STRING, "\\\"sausages\\\"", Some("\\\"sausages\\\""), 0, 11)
        )
      )
    }

    it("should give a single token for strings separated with a space") {
      assertTokens(
        "\"magnificent octopus\"",
        List(quotedStringToken("magnificent octopus"))
      )
    }
  }

  describe("fields") {
    it("should tokenise a colon as a key") {
      assertTokens(
        "+:",
        List(
          Token(PLUS, "+", Some("+"), 0, 0),
          Token(CHIP_KEY, ":", Some(""), 1, 1)
        )
      )
    }

    it("should tokenise keys for fields") {
      assertTokens(
        "+tag:",
        Token(PLUS, "+", Some("+"), 0, 0) :: keyValuePair("tag:", "tag")
      )
    }

    it("should tokenise single-char keys and values") {
      assertTokens(
        "+k:v",
        Token(PLUS, "+", Some("+"), 0, 0) ::
          keyValuePair("k:", "k", Some("v"), Some("v"))
      )
    }

    it("should handle escaped characters in keys") {
      assertTokens(
        "+tag\\::",
        Token(PLUS, "+", Some("+"), 0, 0) ::
          keyValuePair("tag\\::", "tag\\:")
      )
    }

    it("should handle escaped characters in values") {
      assertTokens(
        "+tag\\::\\:",
        Token(PLUS, "+", Some("+"), 0, 0) ::
          keyValuePair("tag\\::", "tag\\:", Some("\\:"), Some(":"))
      )
    }

    it(
      "should tokenise minus to represent expressions with reversed polarity"
    ) {
      assertTokens(
        "-tag:",
        Token(MINUS, "-", Some("-"), 0, 0) :: keyValuePair("tag:", "tag")
      )
    }

    it("should tokenise key value pairs for fields") {
      assertTokens(
        "+tag:tone/news",
        Token(PLUS, "+", Some("+"), 0, 0) ::
          keyValuePair("tag:", "tag", Some("tone/news"), Some("tone/news"))
      )
    }

    it("should tokenise consecutive fields") {
      assertTokens(
        "+tag:tone/news +tag:tone/news",
        (Token(PLUS, "+", Some("+"), 0, 0) ::
          keyValuePair("tag:", "tag", Some("tone/news"), Some("tone/news"))) :::
          (Token(PLUS, "+", Some("+"), 15, 15) ::
            keyValuePair(
              "tag:",
              "tag",
              Some("tone/news"),
              Some("tone/news"),
              16
            ))
      )
    }

    it("should tokenise key value pairs for fields - 2") {
      assertTokens(
        "+section:commentisfree",
        Token(PLUS, "+", Some("+"), 0, 0) ::
          keyValuePair(
            "section:",
            "section",
            Some("commentisfree"),
            Some("commentisfree")
          )
      )
    }

    describe("quoted keys and values") {
      it(
        "should tokenise key value pairs for fields when the key is in quotes, with prefix"
      ) {
        assertTokens(
          "+\"Byline Title\":\"tone news\"",
          Token(PLUS, "+", Some("+"), 0, 0) ::
            keyValuePair(
              "\"Byline Title\":",
              "Byline Title",
              Some("\"tone news\""),
              Some("tone news")
            )
        )
      }

      it(
        "should tokenise key value pairs for fields when the key is in quotes, without prefix"
      ) {
        assertTokens(
          "\"Byline Title\":\"tone news\"",
          keyValuePair(
            "\"Byline Title\":",
            "Byline Title",
            Some("\"tone news\""),
            Some("tone news"),
            0
          )
        )
      }

      it(
        "should tokenise key value pairs for fields when the value is in quotes"
      ) {
        assertTokens(
          "+tag:\"tone/news\"",
          Token(PLUS, "+", Some("+"), 0, 0) ::
            keyValuePair(
              "tag:",
              "tag",
              Some("\"tone/news\""),
              Some("tone/news")
            )
        )
      }

      it(
        "should tokenise key value pairs for fields, and give `undefined` for empty quotes"
      ) {
        assertTokens(
          "+tag:\"\"",
          Token(PLUS, "+", Some("+"), 0, 0) ::
            keyValuePair("tag:", "tag", Some("\"\""), None)
        )
      }
    }

    it(
      "should tokenise key value pairs for fields when the key value contains non-word characters"
    ) {
      assertTokens(
        "+@tag:\"tone/news\"",
        Token(PLUS, "+", Some("+"), 0, 0) ::
          keyValuePair("@tag:", "@tag", Some("\"tone/news\""), Some("tone/news"))
      )
    }

    it(
      "should tokenise unprefixed key value pairs for fields when the key value contains non-word characters"
    ) {
      assertTokens(
        "@tag.tag:\"tone/news\"",
        keyValuePair(
          "@tag.tag:",
          "@tag.tag",
          Some("\"tone/news\""),
          Some("tone/news"),
          0
        )
      )
    }

    it("should yield a plus token") {
      assertTokens(
        "example +",
        List(
          unquotedStringToken("example"),
          Token(PLUS, "+", Some("+"), 8, 8)
        )
      )
    }

    it(
      "should yield a query field value token when a query value is incomplete"
    ) {
      assertTokens(
        "example +tag:",
        List(
          unquotedStringToken("example"),
          Token(PLUS, "+", Some("+"), 8, 8)
        ) ::: keyValuePair("tag:", "tag", None, None, 9)
      )
    }
  }

  describe("groups") {
    it("should tokenise groups") {
      assertTokens(
        "(two OR three)",
        List(
          Token(LEFT_BRACKET, "(", None, 0, 0),
          unquotedStringToken("two", 1),
          Token(OR, "OR", None, 5, 6),
          unquotedStringToken("three", 8),
          Token(RIGHT_BRACKET, ")", None, 13, 13)
        )
      )
    }

    it("should tokenise groups and boolean operators - 1") {
      assertTokens(
        "one AND (two OR three)",
        List(
          unquotedStringToken("one"),
          Token(AND, "AND", None, 4, 6),
          Token(LEFT_BRACKET, "(", None, 8, 8),
          unquotedStringToken("two", 9),
          Token(OR, "OR", None, 13, 14),
          unquotedStringToken("three", 16),
          Token(RIGHT_BRACKET, ")", None, 21, 21)
        )
      )
    }

    it("should tokenise groups and boolean operators - 2") {
      assertTokens(
        "one AND two",
        List(
          unquotedStringToken("one"),
          Token(AND, "AND", None, 4, 6),
          unquotedStringToken("two", 8)
        )
      )
    }
  }

  describe("without field prefix") {
    it("should tokenise keys for fields") {
      assertTokens("tag:", keyValuePair("tag:", "tag", None, None, 0))
    }

    it(
      "should tokenise key value pairs for fields, and give `undefined` for empty quotes,"
    ) {
      assertTokens(
        "tag:\"\"",
        keyValuePair("tag:", "tag", Some("\"\""), None, 0)
      )
    }

    it(
      "should tokenise key value pairs for fields when the key value contains non-word characters"
    ) {
      assertTokens(
        "@tag:\"tone/news\"",
        keyValuePair("@tag:", "@tag", Some("\"tone/news\""), Some("tone/news"), 0)
      )
    }

    it(
      "should yield a query field value token when a query meta value is incomplete"
    ) {
      assertTokens(
        "example tag:",
        unquotedStringToken("example") ::
          keyValuePair("tag:", "tag", None, None, 8)
      )
    }

    it(
      "should tokenise key value pairs for fields when the key value is in quotes, containing whitespace and colon"
    ) {
      assertTokens(
        "tag:\"tone news:\"",
        keyValuePair("tag:", "tag", Some("\"tone news:\""), Some("tone news:"), 0)
      )
    }

    it(
      "should tokenise key value pairs for fields when the key value is in quotes, containing an escaped quote"
    ) {
      assertTokens(
        "tag:\"tone\\\"news:\"",
        keyValuePair(
          "tag:",
          "tag",
          Some("\"tone\\\"news:\""),
          Some("tone\\\"news:"),
          0
        )
      )
    }

    it("should tokenise key value pairs for fields") {
      assertTokens(
        "tag:tone/news",
        keyValuePair("tag:", "tag", Some("tone/news"), Some("tone/news"), 0)
      )
    }
  }

  describe("settings") {
    describe("`groups: false`") {
      it("should disable groups, interpreting parentheses as strings") {
        assertTokens(
          "(two)",
          List(
            unquotedStringToken("(two", 0),
            unquotedStringToken(")", 4)
          ),
          ScannerSettings(groups = false)
        )
      }
    }

    describe("`operators: false`") {
      it("should disable operators, interpreting them as strings") {
        assertTokens(
          "this AND that",
          List(
            unquotedStringToken("this", 0),
            unquotedStringToken("AND", 5),
            unquotedStringToken("that", 9)
          ),
          ScannerSettings(operators = false)
        )
      }
    }

    describe("shortcuts") {
      it(
        "should throw an error when a shortcut conflicts with a reserved character"
      ) {
        assertThrows[IllegalArgumentException] {
          Scanner.scan("", ScannerSettings(shortcuts = Map("(" -> "invalid")))
        }
      }

      it(
        "should throw an error when a shortcut is more than a single character long"
      ) {
        assertThrows[IllegalArgumentException] {
          Scanner.scan("", ScannerSettings(shortcuts = Map("aa" -> "invalid")))
        }
      }

      it("parse a shortcut followed by a chip value") {
        assertTokens(
          "#tone/news",
          keyValuePair("#", "tag", Some("tone/news"), Some("tone/news"), 0),
          ScannerSettings(shortcuts = Map("#" -> "tag"))
        )
      }
    }
  }
}
