package cql

import cql.grammar.{QueryList, QueryMeta}

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global


class TypeaheadTest extends BaseTest {
  describe("typeahead") {
    val typeaheadQueryClient = new TypeaheadQueryClientTest()
    val typeahead = new Typeahead(typeaheadQueryClient)

    it("should give no typeahead where none is warranted") {
      typeahead.getSuggestions(QueryList(List.empty)).map { result =>
        result shouldBe Map.empty
      }

      typeahead
        .getSuggestions(
          QueryList(List(QueryMeta("example", None)))
        )
        .map { result =>
          result shouldBe Map("QUERY_META_KEY" -> Map("example" -> List()))
        }
    }

    it("should give typeahead suggestions for query meta keys") {
      typeahead.getSuggestions(QueryList(List.empty)).map { result =>
        result shouldBe Map.empty
      }

      typeahead
        .getSuggestions(
          QueryList(List(QueryMeta("ta", None)))
        )
        .map { result =>
          result shouldBe Map(
            "QUERY_META_KEY" -> Map(
              "ta" -> List(TypeaheadSuggestion("Tag", "tag"))
            )
          )
        }
    }

    it(
      "should give typeahead suggestions for both query meta keys and values"
    ) {
      typeahead.getSuggestions(QueryList(List.empty)).map { result =>
        result shouldBe Map.empty
      }

      typeahead
        .getSuggestions(
          QueryList(List(QueryMeta("tag", Some("tags-are-magi"))))
        )
        .map { result =>
          result shouldBe Map(
            "QUERY_META_KEY" -> Map(
              "tag" -> List(TypeaheadSuggestion("Tag", "tag"))
            ),
            "QUERY_META_VALUE" -> Map(
              "tags-are-magi" -> List(
                TypeaheadSuggestion("Tags are magic", "tags-are-magic")
              )
            )
          )
        }
    }

    it(
      "should give value suggestions for an empty string"
    ) {
      typeahead.getSuggestions(QueryList(List.empty)).map { result =>
        result shouldBe Map.empty
      }

      typeahead
        .getSuggestions(
          QueryList(List(QueryMeta("tag", Some(""))))
        )
        .map { result =>
          result shouldBe Map(
            "QUERY_META_KEY" -> Map(
              "tag" -> List(TypeaheadSuggestion("Tag", "tag"))
            ),
            "QUERY_META_VALUE" -> Map(
              "" -> List(
                TypeaheadSuggestion("Tags are magic", "tags-are-magic")
              )
            )
          )
        }
    }
  }
}
