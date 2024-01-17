package cql

class ScannerTest extends BaseTest {
  val eofToken = Token(TokenType.EOF, "", null, 1)
  def unquotedStringToken(str: String) = Token(TokenType.STRING, str, str, 1)
  def quotedStringToken(str: String) = Token(TokenType.STRING, s"\"$str\"", str, 1)
  def tagToken(path: String) = Token(TokenType.TAG, path, null, 1)
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
        Token(TokenType.TAG, "+tag", null, 1),
        Token(TokenType.COLON, ":", null, 1),
        unquotedStringToken("tone/news"),
        eofToken
      )
      assert(tokens === expectedTokens)
    }

    it("should tokenise sections") {
      val scanner = new Scanner("""+section:commentisfree""")
      val tokens = scanner.scanTokens
      val expectedTokens = List(
        Token(TokenType.SECTION, "+section", null, 1),
        Token(TokenType.COLON, ":", null, 1),
        unquotedStringToken("commentisfree"),
        eofToken
      )
      assert(tokens === expectedTokens)
    }
  }
}
