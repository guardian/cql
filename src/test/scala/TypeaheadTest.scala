package cql

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

class TypeaheadTest extends BaseTest {
  describe("typeahead") {
    val typeaheadQueryClient = new TypeaheadQueryCapiClient()
    val typeahead = new Typeahead(typeaheadQueryClient)

    it("should give no typeahead where none is warranted") {
      typeahead.getSuggestions(List.empty).map { result =>
        result shouldBe Map.empty
      }

      typeahead
        .getSuggestions(
          List(Token(TokenType.STRING, "example", Some("example"), 0, 7))
        )
        .map { result => result shouldBe Map.empty }
    }

    it("should give typeahead suggestions for query meta keys") {
      typeahead.getSuggestions(List.empty).map { result =>
        result shouldBe Map.empty
      }

      typeahead
        .getSuggestions(
          List(Token(TokenType.QUERY_META_KEY, "ta", Some("ta"), 0, 7))
        )
        .map { result => result shouldBe Map(
          "QUERY_META_KEY" -> Map(
            "ta" -> List(TypeaheadSuggestion("Tag", "tag"))
          )
        ) }
    }
  }
}
