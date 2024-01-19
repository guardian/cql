package cql

class ScannerTest extends BaseTest {
  val eofToken = Token(TokenType.EOF, "", null, 1)
  def unquotedStringToken(str: String) = Token(TokenType.STRING, str, str, 1)
  def quotedStringToken(str: String) = Token(TokenType.STRING, s"\"$str\"", str, 1)
//
//  describe("unquoted strings") {
//    it("should parse plain strings") {
//      val scanner = new Scanner("""sausages""")
//      val tokens = scanner.scanTokens
//      val expectedTokens = List(
//        unquotedStringToken("sausages"),
//        eofToken
//      )
//      assert(tokens === expectedTokens)
//    }
//
//    it("should give multiple tokens for strings separated with a space") {
//      val scanner = new Scanner("""magnificent octopus""")
//      val tokens = scanner.scanTokens
//      val expectedTokens = List(
//        unquotedStringToken("magnificent"),
//        unquotedStringToken("octopus"),
//        eofToken
//      )
//      assert(tokens === expectedTokens)
//    }
//  }
//
//  describe("quoted strings") {
//    it("should parse plain strings") {
//      val scanner = new Scanner(""""sausages"""")
//      val tokens = scanner.scanTokens
//      val expectedTokens = List(
//        quotedStringToken("sausages"),
//        eofToken
//      )
//      assert(tokens === expectedTokens)
//    }
//
//    it("should give multiple tokens for strings separated with a space") {
//      val scanner = new Scanner(""""magnificent octopus"""")
//      val tokens = scanner.scanTokens
//      val expectedTokens = List(
//        quotedStringToken("magnificent octopus"),
//        eofToken
//      )
//      assert(tokens === expectedTokens)
//    }
//  }

  describe("search params") {
    it("should tokenise tags") {
      val scanner = new Scanner("""+tag:tone/news""")
      val tokens = scanner.scanTokens
      val expectedTokens = List(
        Token(TokenType.SEARCH_KEY, "+tag", "tag", 1),
        Token(TokenType.SEARCH_VALUE, ":tone/news",  "tone/news", 1),
        eofToken
      )
      assert(tokens === expectedTokens)
    }

    it("should tokenise sections") {
      val scanner = new Scanner("""+section:commentisfree""")
      val tokens = scanner.scanTokens
      val expectedTokens = List(
        Token(TokenType.SEARCH_KEY, "+section", "section", 1),
        Token(TokenType.SEARCH_VALUE, ":commentisfree", "commentisfree", 1),
        eofToken
      )
      assert(tokens === expectedTokens)
    }

    it("should tokenise groups and boolean operators") {
      val scanner = new Scanner("""one AND (two OR three)""")
      val tokens = scanner.scanTokens
      val expectedTokens = List(
        unquotedStringToken("one"),
        Token(TokenType.AND, "AND", null, 1),
        Token(TokenType.LEFT_BRACKET, "(", null, 1),
        unquotedStringToken("two"),
        Token(TokenType.OR, "OR", null, 1),
        unquotedStringToken("three"),
        Token(TokenType.RIGHT_BRACKET, ")", null, 1),
        eofToken
      )
      assert(tokens === expectedTokens)
    }
  }
}
