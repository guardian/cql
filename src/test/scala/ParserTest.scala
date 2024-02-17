package cql

import cql.grammar.QueryList
import concurrent.ExecutionContext.Implicits.global // Todo: sticking plaster
import scala.util.Failure
import scala.util.Success

class ParserTest extends BaseTest {
  describe("groups") {
    it("should handle unmatched parenthesis") {
      val tokens = List(leftParen(), eofToken(2))
      val result = new Parser(tokens).parse()
      result match
        case Failure(exception) =>
          exception
            .getMessage()
            .contains("Groups must contain some content") shouldBe true
        case Success(value) => fail("This should not parse")
    }

    it("should handle an empty token list") {
      val tokens = List(eofToken(0))
      val result = new Parser(tokens).parse()
      result shouldBe Success(QueryList(List.empty))
    }

    it("should handle an unbalanced binary") {
      val tokens = List(quotedStringToken("example"), andToken(7), eofToken(0))
      val result = new Parser(tokens).parse()
      result match
        case Failure(exception) =>
          exception
            .getMessage()
            .contains("There must be a query following 'AND'") shouldBe true
        case Success(value) =>
          fail("This should not parse")
    }
  }
}
