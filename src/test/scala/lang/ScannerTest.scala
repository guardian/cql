package cql.lang

class ScannerTest extends BaseTest {
  describe("unquoted strings") {
    it("should parse plain strings") {
      val scanner = new Scanner("""sausages""")
      val tokens = scanner.scanTokens
      val expectedTokens = List(
        unquotedStringToken("sausages"),
        eofToken(8)
      )
      assert(tokens === expectedTokens)
    }

    it("should give multiple tokens for strings separated with a space") {
      val scanner = new Scanner("""magnificent octopus""")
      val tokens = scanner.scanTokens
      val expectedTokens = List(
        unquotedStringToken("magnificent"),
        unquotedStringToken("octopus", 12),
        eofToken(19)
      )
      assert(tokens === expectedTokens)
    }
  }

  describe("quoted strings") {
    it("should parse plain strings") {
      val scanner = new Scanner(""""sausages"""")
      val tokens = scanner.scanTokens
      val expectedTokens = List(
        quotedStringToken("sausages"),
        eofToken(10)
      )
      assert(tokens === expectedTokens)
    }

    it("should give a single token for strings separated with a space") {
      val scanner = new Scanner(""""magnificent octopus"""")
      val tokens = scanner.scanTokens
      val expectedTokens = List(
        quotedStringToken("magnificent octopus"),
        eofToken(21)
      )
      assert(tokens === expectedTokens)
    }
  }

  describe("search params") {
    it("should tokenise key value pairs for fields") {
      val scanner = new Scanner("""+tag:tone/news""")
      val tokens = scanner.scanTokens
      val expectedTokens = List(
        Token(TokenType.QUERY_FIELD_KEY, "+tag", Some("tag"), 0, 3),
        Token(
          TokenType.QUERY_VALUE,
          ":tone/news",
          Some("tone/news"),
          4,
          13
        ),
        eofToken(14)
      )
      assert(tokens === expectedTokens)
    }

    it("should tokenise key value pairs for fields - 2") {
      val scanner = new Scanner("""+section:commentisfree""")
      val tokens = scanner.scanTokens
      val expectedTokens = List(
        Token(TokenType.QUERY_FIELD_KEY, "+section", Some("section"), 0, 7),
        Token(
          TokenType.QUERY_VALUE,
          ":commentisfree",
          Some("commentisfree"),
          8,
          21
        ),
        eofToken(22)
      )
      assert(tokens === expectedTokens)
    }

    it("should yield a query field key when a search key is incomplete") {
      val scanner = new Scanner("""example +""")
      val tokens = scanner.scanTokens
      val expectedTokens = List(
        unquotedStringToken("example"),
        Token(TokenType.QUERY_FIELD_KEY, "+", None, 8, 8),
        eofToken(9)
      )
      assert(tokens === expectedTokens)
    }

    it("should yield a query field value token when a query meta value is incomplete") {
      val scanner = new Scanner("""example +tag:""")
      val tokens = scanner.scanTokens
      val expectedTokens = List(
        unquotedStringToken("example"),
        Token(TokenType.QUERY_FIELD_KEY, "+tag", Some("tag"), 8, 11),
        Token(TokenType.QUERY_VALUE, ":", None, 12, 12),
        eofToken(13)
      )
      assert(tokens === expectedTokens)
    }

    it("should tokenise key value pairs for output modifiers") {
      val scanner = new Scanner("""@show-fields:all""")
      val tokens = scanner.scanTokens
      val expectedTokens = List(
        Token(TokenType.QUERY_OUTPUT_MODIFIER_KEY, "@show-fields", Some("show-fields"), 0, 11),
        Token(
          TokenType.QUERY_VALUE,
          ":all",
          Some("all"),
          12,
          15
        ),
        eofToken(16)
      )
      assert(tokens === expectedTokens)
    }

    it("should tokenise groups and boolean operators") {
      val scanner = new Scanner("""one AND (two OR three)""")
      val tokens = scanner.scanTokens
      val expectedTokens = List(
        unquotedStringToken("one"),
        Token(TokenType.AND, "AND", None, 4, 6),
        Token(TokenType.LEFT_BRACKET, "(", None, 8, 8),
        unquotedStringToken("two", 9),
        Token(TokenType.OR, "OR", None, 13, 14),
        unquotedStringToken("three", 16),
        Token(TokenType.RIGHT_BRACKET, ")", None, 21, 21),
        eofToken(22)
      )
      assert(tokens === expectedTokens)
    }

    it("should tokenise groups") {
      val scanner = new Scanner("""(two OR three)""")
      val tokens = scanner.scanTokens
      val expectedTokens = List(
        Token(TokenType.LEFT_BRACKET, "(", None, 0, 0),
        unquotedStringToken("two", 1),
        Token(TokenType.OR, "OR", None, 5, 6),
        unquotedStringToken("three", 8),
        Token(TokenType.RIGHT_BRACKET, ")", None, 13, 13),
        eofToken(14)
      )
      assert(tokens === expectedTokens)
    }
  }
}
