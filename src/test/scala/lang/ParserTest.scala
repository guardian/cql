package cql.lang

import org.scalatest.compatible.Assertion

import TokenType.*

class ParserTest extends BaseTest {
  def assertFailure(
      result: Either[ParseError, CqlQuery],
      strContains: String
  ): Assertion =
    result match
      case Left(error) => error.message should include(strContains)
      case Right(_)    => fail("This should not parse")

  describe("CqlQuery") {
    it("should handle an empty token list") {
      val tokens = List(eofToken(0))
      val result = Parser.parse(tokens)
      result shouldBe Right(CqlQuery(None))
    }
  }

  describe("CqlGroup") {
    it("should handle unmatched parenthesis - lhs") {
      val tokens = List(leftParenToken(), eofToken(2))
      val result = Parser.parse(tokens)
      assertFailure(result, "Groups can't be empty")
    }

    it("should handle unmatched parenthesis - rhs, first token") {
      val tokens = List(rightParenToken(), eofToken(2))
      val result = Parser.parse(tokens)
      assertFailure(result, "I didn't expect to find a `)` here.")
    }

    it("should handle unmatched parenthesis - rhs, subsequent tokens") {
      val tokens =
        List(unquotedStringToken("a"), rightParenToken(1), eofToken(2))
      val result = Parser.parse(tokens)
      assertFailure(result, "I didn't expect to find a `)` after `a`")
    }

    it("should handle empty groups") {
      val tokens = List(leftParenToken(), rightParenToken(1))
      val result = Parser.parse(tokens)
      assertFailure(result, "Groups can't be empty")
    }

    it("should handle groups with consecutive string tokens") {
      val tokens = List(
        leftParenToken(),
        unquotedStringToken("a", 1),
        unquotedStringToken("b", 2),
        rightParenToken(3),
        eofToken(4)
      )
      val result = Parser.parse(tokens)
      result shouldBe Right(
        CqlQuery(
          Some(
            CqlBinary(
              CqlUnary(
                CqlGroup(
                  CqlBinary(
                    CqlUnary(CqlStr(unquotedStringToken("a", 1))),
                    Some(
                      CqlBinaryRight(
                        CqlBinaryOperator(OR, ""),
                        CqlUnary(CqlStr(unquotedStringToken("b", 2)))
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    }
  }

  describe("CqlBinary") {
    it("should handle an unbalanced boolean") {
      val tokens =
        List(quotedStringToken("example"), andToken(7), eofToken(0))
      val result = Parser.parse(tokens)
      assertFailure(result, "I expected something else after `AND`")
    }

    it("should handle an unbalanced binary within parenthesis") {
      val tokens = List(
        leftParenToken(),
        quotedStringToken("example", 1),
        andToken(8),
        rightParenToken(9),
        eofToken(10)
      )
      val result = Parser.parse(tokens)
      assertFailure(result, "I didn't expect to find a `)` after `AND`")
    }

    it("should handle a solo boolean operator") {
      val tokens = List(andToken())
      val result = Parser.parse(tokens)
      assertFailure(
        result,
        "An `AND` keyword must have a search term before and after it, e.g. `this AND that`"
      )
    }
  }

  describe("CqlField") {
    it("should handle a query field without a value") {
      val tokens =
        List(plusToken(0), queryFieldKeyToken("", 1), eofToken(4))
      val result = Parser.parse(tokens)
      result shouldBe Right(
        CqlQuery(Some(CqlBinary(CqlUnary(queryField("", None, 1)))))
      )
    }

    it("should handle a query field") {
      val tokens =
        List(queryFieldKeyToken("ta"), queryValueToken("", 3), eofToken(4))
      val result = Parser.parse(tokens)
      result shouldBe Right(
        CqlQuery(Some(CqlBinary(CqlUnary(queryField("ta", Some(""))))))
      )
    }

    it("should handle a query field with a negation") {
      val tokens = List(
        minusToken(),
        queryFieldKeyToken("ta"),
        queryValueToken("", 3),
        eofToken(4)
      )
      val result = Parser.parse(tokens)
      result shouldBe Right(
        CqlQuery(
          Some(
            CqlBinary(
              CqlUnary(queryField("ta", Some("")), Polarity.NEGATIVE)
            )
          )
        )
      )
    }

    it("should handle a query field incorrectly nested in parentheses") {
      val tokens =
        List(leftParenToken(), queryFieldKeyToken("tag", 1), eofToken(5))
      val result = Parser.parse(tokens)
      assertFailure(
        result,
        "You cannot query for the field `tag` within a group"
      )
    }

    it("should handle a query field incorrectly following binary operators") {
      val tokens = List(
        quotedStringToken("a"),
        andToken(1),
        queryFieldKeyToken("tag", 5),
        queryValueToken("b", 8),
        eofToken(10)
      )
      val result = Parser.parse(tokens)
      assertFailure(result, "You cannot query for the field `tag` after `AND`")
    }

    it("should handle an empty query field key") {
      val tokens = List(
        quotedStringToken("a"),
        queryFieldKeyToken("", 2),
        eofToken(5)
      )
      val result = Parser.parse(tokens)
      result shouldBe Right(
        CqlQuery(
          Some(
            CqlBinary(
              CqlUnary(CqlStr(quotedStringToken("a"))),
              Some(
                CqlBinaryRight(
                  CqlBinaryOperator(OR, ""),
                  CqlUnary(CqlField(queryFieldKeyToken("", 2), None))
                )
              )
            )
          )
        )
      )
    }

    it("should handle a query value with no query key") {
      val tokens = List(queryValueToken("", 7), eofToken(8))
      val result = Parser.parse(tokens)
      assertFailure(result, "I found an unexpected `:`")
    }
  }

  it("should not crash on arbitrary tokens") {
    val tokenPermutations = List(
      queryFieldKeyToken("tag"),
      queryValueToken("news"),
      andToken(1),
      leftParenToken(),
      quotedStringToken("sausages"),
      rightParenToken(1),
      unquotedStringToken("eggs"),
      eofToken(14)
    ).permutations.take(1000).toList

    noException should be thrownBy tokenPermutations.foreach(Parser.parse)
  }
}
