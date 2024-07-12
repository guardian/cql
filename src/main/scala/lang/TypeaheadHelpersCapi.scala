package cql.lang

import scala.concurrent.Future
import com.gu.contentapi.client.{ContentApiClient, GuardianContentClient}
import scala.concurrent.ExecutionContext.Implicits.global

class TypeaheadHelpersCapi(client: GuardianContentClient) {

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
    ),
    TypeaheadField(
      "from-date",
      "From date",
      "The date to search from",
      List.empty,
      "DATE"
    ),
    TypeaheadField(
      "to-date",
      "To date",
      "The date to search to",
      List.empty,
      "DATE"
    )
  )

  val outputModifierResolvers = List(
    TypeaheadField(
      "show-fields",
      "Show fields",
      "Determine the list of fields to return",
      List(
        TextSuggestionOption("all", "all", "Description"),
        TextSuggestionOption("trailText", "trailText", "Description"),
        TextSuggestionOption("headline", "headline", "Description"),
        TextSuggestionOption(
          "showInRelatedContent",
          "showInRelatedContent",
          "Description"
        ),
        TextSuggestionOption("body", "body", "Description"),
        TextSuggestionOption("lastModified", "lastModified", "Description"),
        TextSuggestionOption(
          "hasStoryPackage",
          "hasStoryPackage",
          "Description"
        ),
        TextSuggestionOption("score", "score", "Description"),
        TextSuggestionOption("standfirst", "standfirst", "Description"),
        TextSuggestionOption("shortUrl", "shortUrl", "Description"),
        TextSuggestionOption("thumbnail", "thumbnail", "Description"),
        TextSuggestionOption("wordcount", "wordcount", "Description"),
        TextSuggestionOption("commentable", "commentable", "Description"),
        TextSuggestionOption("isPremoderated", "isPremoderated", "Description"),
        TextSuggestionOption("allowUgc", "allowUgc", "Description"),
        TextSuggestionOption("byline", "byline", "Description"),
        TextSuggestionOption("publication", "publication", "Description"),
        TextSuggestionOption(
          "internalPageCode",
          "internalPageCode",
          "Description"
        ),
        TextSuggestionOption(
          "productionOffice",
          "productionOffice",
          "Description"
        ),
        TextSuggestionOption(
          "shouldHideAdverts",
          "shouldHideAdverts",
          "Description"
        ),
        TextSuggestionOption(
          "liveBloggingNow",
          "liveBloggingNow",
          "Description"
        ),
        TextSuggestionOption(
          "commentCloseDate",
          "commentCloseDate",
          "Description"
        ),
        TextSuggestionOption("starRating", "starRating", "Description")
      )
    )
  )

  private def getTags(str: String): Future[List[TextSuggestionOption]] =
    val query = str match
      case ""  => ContentApiClient.tags
      case str => ContentApiClient.tags.q(str)
    client.getResponse(query).map { response =>
      response.results.map { tag =>
        TextSuggestionOption(
          tag.webTitle,
          tag.id,
          tag.description.getOrElse("")
        )
      }.toList
    }

  private def getSections(str: String): Future[List[TextSuggestionOption]] =
    val query = str match
      case ""  => ContentApiClient.sections
      case str => ContentApiClient.sections.q(str)
    client.getResponse(query).map { response =>
      response.results.map { section =>
        TextSuggestionOption(section.webTitle, section.id, section.webTitle)
      }.toList
    }
}
