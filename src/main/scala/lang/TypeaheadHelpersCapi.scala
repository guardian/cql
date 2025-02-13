package cql.lang

import scala.concurrent.Future
import com.gu.contentapi.client.{ContentApiClient, GuardianContentClient}
import scala.concurrent.ExecutionContext.Implicits.global

class TypeaheadHelpersCapi(client: GuardianContentClient) {

  val typeaheadFields = List(
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
      suggestionType = "DATE"
    ),
    TypeaheadField(
      "to-date",
      "To date",
      "The date to search to",
      suggestionType = "DATE"
    ),
    TypeaheadField(
      "format",
      "Format",
      "The format to return the results in",
      List(
        TextSuggestionOption("JSON", "json", Some("JSON format")),
        TextSuggestionOption("XML", "xml", Some("XML format"))
      )
    ),
    TypeaheadField(
      "query-fields",
      "Query fields",
      "Specify in which indexed fields query terms should be searched on, e.g. 'body', 'body, thumbnail'"
    ),
    TypeaheadField(
      "reference",
      "Reference",
      "Return only content with those references, e.g. 'isbn/9780718178949'"
    ),
    TypeaheadField(
      "reference-type",
      "Reference type",
      "Return only content with references of those types, e.g. 'isbn'"
    ),
    TypeaheadField(
      "rights",
      "Rights",
      "Return only content with those rights",
      List(
        TextSuggestionOption(
          "Syndicatable",
          "syndicatable",
          Some("Content that can be syndicated")
        ),
        TextSuggestionOption(
          "Subscription databases",
          "syndicatable",
          Some("Content that is available to developer-tier keys")
        )
      )
    ),
    TypeaheadField(
      "ids",
      "IDs",
      "Return only content with those IDs, e.g. technology/2014/feb/17/flappy-bird-clones-apple-google"
    ),
    TypeaheadField(
      "Production office",
      "production-office",
      "Return only content from those production offices, e.g. 'aus', 'uk,aus'",
      List(
        TextSuggestionOption("UK", "uk", Some("The UK production office")),
        TextSuggestionOption(
          "Australia",
          "aus",
          Some("The Australia production office")
        ),
        TextSuggestionOption("US", "us", Some("The US production office"))
      )
    ),
    TypeaheadField(
      "Language",
      "lang",
      "Return content that has the given ISO language code, e.g. 'en', 'fr'"
    ),
    TypeaheadField(
      "Star rating",
      "star-rating",
      "Return only content with a given star rating",
      List(
        TextSuggestionOption("1", "1"),
        TextSuggestionOption("2", "2"),
        TextSuggestionOption("3", "3"),
        TextSuggestionOption("4", "4"),
        TextSuggestionOption("5", "5")
      )
    )
  )

  val outputModifierResolvers = List(
    TypeaheadField(
      "show-fields",
      "Show fields",
      "Determine the list of fields to return",
      List(
        TextSuggestionOption("all", "all", Some("Description")),
        TextSuggestionOption("trailText", "trailText", Some("Description")),
        TextSuggestionOption("headline", "headline", Some("Description")),
        TextSuggestionOption(
          "showInRelatedContent",
          "showInRelatedContent",
          Some("Description")
        ),
        TextSuggestionOption("body", "body", Some("Description")),
        TextSuggestionOption("lastModified", "lastModified", Some("Description")),
        TextSuggestionOption(
          "hasStoryPackage",
          "hasStoryPackage",
          Some("Description")
        ),
        TextSuggestionOption("score", "score", Some("Description")),
        TextSuggestionOption("standfirst", "standfirst", Some("Description")),
        TextSuggestionOption("shortUrl", "shortUrl", Some("Description")),
        TextSuggestionOption("thumbnail", "thumbnail", Some("Description")),
        TextSuggestionOption("wordcount", "wordcount", Some("Description")),
        TextSuggestionOption("commentable", "commentable", Some("Description")),
        TextSuggestionOption("isPremoderated", "isPremoderated", Some("Description")),
        TextSuggestionOption("allowUgc", "allowUgc", Some("Description")),
        TextSuggestionOption("byline", "byline", Some("Description")),
        TextSuggestionOption("publication", "publication", Some("Description")),
        TextSuggestionOption(
          "internalPageCode",
          "internalPageCode",
          Some("Description")
        ),
        TextSuggestionOption(
          "productionOffice",
          "productionOffice",
          Some("Description")
        ),
        TextSuggestionOption(
          "shouldHideAdverts",
          "shouldHideAdverts",
          Some("Description")
        ),
        TextSuggestionOption(
          "liveBloggingNow",
          "liveBloggingNow",
          Some("Description")
        ),
        TextSuggestionOption(
          "commentCloseDate",
          "commentCloseDate",
          Some("Description")
        ),
        TextSuggestionOption("starRating", "starRating", Some("Description"))
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
          tag.description
        )
      }.toList
    }

  private def getSections(str: String): Future[List[TextSuggestionOption]] =
    val query = str match
      case ""  => ContentApiClient.sections
      case str => ContentApiClient.sections.q(str)
    client.getResponse(query).map { response =>
      response.results.map { section =>
        TextSuggestionOption(section.webTitle, section.id, Some(section.webTitle))
      }.toList
    }
}
