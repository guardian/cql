package cql.lang

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
            TypeaheadSuggestion(
              0,
              7,
              ":",
              TextSuggestion(List.empty)
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
            TypeaheadSuggestion(
              0,
              2,
              ":",
              TextSuggestion(
                List(
                  TextSuggestionOption("Tag", "tag")
                )
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
            TypeaheadSuggestion(
              0,
              3,
              ":",
              TextSuggestion(
                List(
                  TextSuggestionOption("Tag", "tag")
                )
              )
            ),
            TypeaheadSuggestion(
              5,
              18,
              " ",
              TextSuggestion(
                List(
                  TextSuggestionOption("Tags are magic", "tags-are-magic")
                )
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
            TypeaheadSuggestion(
              0,
              3,
              ":",
              TextSuggestion(
                List(
                  TextSuggestionOption("Tag", "tag")
                )
              )
            ),
            TypeaheadSuggestion(
              5,
              5,
              " ",
              TextSuggestion(
                List(
                  TextSuggestionOption("Tags are magic", "tags-are-magic")
                )
              )
            )
          )
        }
    }

    it(
      "should give a suggestion of type DATE given e.g. 'from-date'"
    ) {
      typeahead
        .getSuggestions(
          QueryList(List(queryOutputModifier("from-date", Some(""))))
        )
        .map { result =>
          result shouldBe List(
            TypeaheadSuggestion(
              0,
              9,
              ":",
              TextSuggestion(
                List(
                  TextSuggestionOption("from-date", "from-date")
                )
              )
            ),
            TypeaheadSuggestion(
              11,
              11,
              " ",
              DateSuggestion(None, None)
            )
          )
        }
    }
  }
}
