package cql

import cql.grammar.QueryList
import concurrent.ExecutionContext.Implicits.global // Todo: sticking plaster
import scala.util.Failure
import scala.util.Success
import scala.util.Try

class ParserTest extends BaseTest {
  def assertFailure(queryList: Try[QueryList], strContains: String) =
    queryList match
        case Failure(exception) =>
          exception
            .getMessage()
            .contains(strContains) shouldBe true
        case Success(value) => fail("This should not parse")

  describe("groups") {
    it("should handle unmatched parenthesis") {
      val tokens = List(leftParenToken(), eofToken(2))
      val result = new Parser(tokens).parse()
      assertFailure(result, "Groups must contain some content")
    }

    it("should handle an empty token list") {
      val tokens = List(eofToken(0))
      val result = new Parser(tokens).parse()
      result shouldBe Success(QueryList(List.empty))
    }

    it("should handle an unbalanced binary") {
      val tokens = List(quotedStringToken("example"), andToken(7), eofToken(0))
      val result = new Parser(tokens).parse()
      assertFailure(result, "There must be a query following 'AND'")
    }

    it("should handle a query meta incorrectly nested in parentheses") {
      val tokens = List(leftParenToken(), queryMetaKeyToken("tag", 1), eofToken(5))
      val result = new Parser(tokens).parse()
      assertFailure(result, "You cannot query for tags within a group")
    }

    it("should handle a query meta incorrectly following binary operators") {
      val tokens = List(quotedStringToken("a"), andToken(1), queryMetaKeyToken("tag", 5), eofToken(8))
      val result = new Parser(tokens).parse()
      assertFailure(result, "You cannot query for tags after 'AND'")
    }
  }
}
