package cql

import cql.grammar.{QueryList, QueryField}

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
          QueryList(List(queryField("example", None)))
        )
        .map { result =>
          result shouldBe List(
            TypeaheadTextSuggestions(
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
          QueryList(List(queryField("ta", None)))
        )
        .map { result =>
          result shouldBe List(
            TypeaheadTextSuggestions(
              0,
              2,
              ":",
              List(
                TypeaheadTextSuggestion("Tag", "tag")
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
          QueryList(List(queryField("tag", Some("tags-are-magi"))))
        )
        .map { result =>
          result shouldBe List(
            TypeaheadTextSuggestions(
              0,
              3,
              ":",
              List(
                TypeaheadTextSuggestion("Tag", "tag")
              )
            ),
            TypeaheadTextSuggestions(
              5,
              18,
              " ",
              List(
                TypeaheadTextSuggestion("Tags are magic", "tags-are-magic")
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
          QueryList(List(queryField("tag", Some(""))))
        )
        .map { result =>
          result shouldBe List(
            TypeaheadTextSuggestions(
              0,
              3,
              ":",
              List(
                TypeaheadTextSuggestion("Tag", "tag")
              )
            ),
            TypeaheadTextSuggestions(
              5,
              5,
              " ",
              List(
                TypeaheadTextSuggestion("Tags are magic", "tags-are-magic")
              )
            )
          )
        }
    }
  }
}
