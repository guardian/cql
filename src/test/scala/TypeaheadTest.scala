package cql

import cql.grammar.{QueryList, QueryMeta}

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

class TypeaheadTest extends BaseTest {
  def queryMeta(key: String, value: Option[String], start: Int = 0): QueryMeta =
    QueryMeta(
      queryMetaKeyToken(key, start),
      value.map { str => queryMetaValueToken(str, start + key.length + 2) }
    )

  describe("typeahead") {
    val typeaheadQueryClient = new TypeaheadQueryClientTest()
    val typeahead = new Typeahead(typeaheadQueryClient)

    it("should give no typeahead where none is warranted") {
      typeahead.getSuggestions(QueryList(List.empty)).map { result =>
        result shouldBe Map.empty
      }

      typeahead
        .getSuggestions(
          QueryList(List(queryMeta("example", None)))
        )
        .map { result =>
          result shouldBe List(
            TypeaheadSuggestions(
              0,
              7,
              ":",
              List.empty
            )
          )
        }
    }

    it("should give typeahead suggestions for query meta keys") {
      typeahead.getSuggestions(QueryList(List.empty)).map { result =>
        result shouldBe Map.empty
      }

      typeahead
        .getSuggestions(
          QueryList(List(queryMeta("ta", None)))
        )
        .map { result =>
          result shouldBe List(
            TypeaheadSuggestions(
              0,
              2,
              ":",
              List(
                TypeaheadSuggestion("Tag", "tag")
              )
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
          QueryList(List(queryMeta("tag", Some("tags-are-magi"))))
        )
        .map { result =>
          result shouldBe List(
            TypeaheadSuggestions(
              0,
              3,
              ":",
              List(
                TypeaheadSuggestion("Tag", "tag")
              )
            ),
            TypeaheadSuggestions(
              5,
              18,
              " ",
              List(
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
          QueryList(List(queryMeta("tag", Some(""))))
        )
        .map { result =>
          result shouldBe List(
            TypeaheadSuggestions(
              0,
              3,
              ":",
              List(
                TypeaheadSuggestion("Tag", "tag")
              )
            ),
            TypeaheadSuggestions(
              5,
              5,
              " ",
              List(
                TypeaheadSuggestion("Tags are magic", "tags-are-magic")
              )
            )
          )
        }
    }
  }
}
