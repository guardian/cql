package cql.lang

import scala.concurrent.Future

class TestTypeaheadHelpers {
  val fieldResolvers = List(
    TypeaheadField(
      "tag",
      "Tag",
      "Search by content tags, e.g. sport/football",
      getTags
    ),
    TypeaheadField(
      "section",
      "Section",
      "Search by content sections, e.g. section/news",
      getSections
    )
  )

  val outputModifierResolvers = List(
    TypeaheadField(
      "from-date",
      "From date",
      "The date to search from",
      List.empty
    ),
    TypeaheadField("to-date", "To date", "The date to search to", List.empty)
  )

  private def getTags(str: String): Future[List[TextSuggestionOption]] =
    Future.successful(
      List(
        TextSuggestionOption("Tags are magic", "tags-are-magic", Some("A magic tag"))
      )
    )

  private def getSections(str: String): Future[List[TextSuggestionOption]] =
    Future.successful(
      List(
        TextSuggestionOption(
          "Also sections",
          "sections-are-magic",
          Some("Sections are less magic")
        )
      )
    )
}
