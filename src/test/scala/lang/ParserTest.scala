package cql.lang

import scala.util.{Failure, Success, Try}
import org.scalatest.compatible.Assertion

import TokenType.*

class ParserTest extends BaseTest {
  def assertFailure(result: Try[CqlQuery], strContains: String): Assertion =
    result match
      case Failure(exception) =>
        exception.getMessage should include(strContains)
      case Success(value) => fail("This should not parse")

  describe("CqlQuery") {
    it("should handle an empty token list") {
      val tokens = List(eofToken(0))
      val result = new Parser(tokens).parse()
      result shouldBe Success(CqlQuery(None))
    }
  }

  describe("CqlGroup") {
    it("should handle unmatched parenthesis - lhs") {
      val tokens = List(leftParenToken(), eofToken(2))
      val result = new Parser(tokens).parse()
      assertFailure(result, "Groups can't be empty")
    }

    it("should handle unmatched parenthesis - rhs, first token") {
      val tokens = List(rightParenToken(), eofToken(2))
      val result = new Parser(tokens).parse()
      assertFailure(result, "I didn't expect to find a `)` here.")
    }

    it("should handle unmatched parenthesis - rhs, subsequent tokens") {
      val tokens =
        List(unquotedStringToken("a"), rightParenToken(1), eofToken(2))
      val result = new Parser(tokens).parse()
      assertFailure(result, "I didn't expect to find a `)` after `a`")
    }

    it("should handle empty groups") {
      val tokens = List(leftParenToken(), rightParenToken(1))
      val result = new Parser(tokens).parse()
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
      val result = new Parser(tokens).parse()
      result shouldBe Success(
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
      val result = new Parser(tokens).parse()
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
      val result = new Parser(tokens).parse()
      assertFailure(result, "I didn't expect to find a `)` after `AND`")
    }

    it("should handle a solo boolean operator") {
      val tokens = List(andToken())
      val result = new Parser(tokens).parse()
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
      val result = new Parser(tokens).parse()
      result shouldBe Success(
        CqlQuery(Some(CqlBinary(CqlUnary(queryField("", None, 1)))))
      )
    }

    it("should handle a query field") {
      val tokens =
        List(queryFieldKeyToken("ta"), queryValueToken("", 3), eofToken(4))
      val result = new Parser(tokens).parse()
      result shouldBe Success(
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
      val result = new Parser(tokens).parse()
      result shouldBe Success(
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
      val result = new Parser(tokens).parse()
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
      val result = new Parser(tokens).parse()
      assertFailure(result, "You cannot query for the field `tag` after `AND`")
    }

    it("should handle an empty query field key") {
      val tokens = List(
        quotedStringToken("a"),
        queryFieldKeyToken("", 2),
        eofToken(5)
      )
      val result = new Parser(tokens).parse()
      result shouldBe Success(
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
      val result = new Parser(tokens).parse()
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

    tokenPermutations.foreach { tokens =>
      Try { new Parser(tokens).parse() }
    }

    assert(true)
  }
}
