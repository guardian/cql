package cql

import scala.concurrent.Future
import concurrent.ExecutionContext.Implicits.global
import cql.grammar.QueryField
import cql.grammar.QueryList
import cql.grammar.QueryOutputModifier

sealed trait TypeaheadSuggestion {
  val from: Int
  val to: Int
}

case class TypeaheadTextSuggestions(
    from: Int,
    to: Int,
    // The suffix to apply if this suggestion is accepted at the trailing edge of the query.
    // E.g. when we have typed '+ta' accept the key suggestion 'tag', we'll want to apply '+tag:'
    // to trigger typeahead for the value.
    suffix: String = "",
    suggestions: List[TypeaheadTextSuggestion]
) extends TypeaheadSuggestion

case class TypeaheadTextSuggestion(label: String, value: String)

case class TypeaheadDateSuggestion(
  from: Int,
  to: Int,
) extends TypeaheadSuggestion

class Typeahead(client: TypeaheadQueryClient) {
  private val typeaheadTokenResolverMap = Map(
    TokenType.QUERY_FIELD_KEY -> suggestFieldKey,
    TokenType.QUERY_OUTPUT_MODIFIER_KEY -> suggestOutputModifierKey,
    TokenType.QUERY_VALUE -> suggestFieldValue
  )

  private val typeaheadFieldResolverMap = Map(
    "tag" -> ("Tag", suggestTags),
    "section" -> ("Section", suggestSections)
  )

  private val typeaheadFieldResolverEntries = typeaheadFieldResolverMap.map {
    case (value, (label, _)) => TypeaheadTextSuggestion(label, value)
  }.toList

  private val typeaheadOutputModifierResolverMap = Map(
    "show-fields" -> List(
      "all",
      "trailText",
      "headline",
      "showInRelatedContent",
      "body",
      "lastModified",
      "hasStoryPackage",
      "score",
      "standfirst",
      "shortUrl",
      "thumbnail",
      "wordcount",
      "commentable",
      "isPremoderated",
      "allowUgc",
      "byline",
      "publication",
      "internalPageCode",
      "productionOffice",
      "shouldHideAdverts",
      "liveBloggingNow",
      "commentCloseDate",
      "starRating"
    )
  )

  private val typeaheadOutputModifierResolverEntries =
    typeaheadOutputModifierResolverMap.keys.map { case key =>
      TypeaheadTextSuggestion(key, key)
    }.toList

  def getSuggestions(
      program: QueryList
  ): Future[List[TypeaheadTextSuggestions | TypeaheadDateSuggestion]] =
    val eventuallySuggestions = program.exprs.collect {
      case q: QueryField =>
        suggestQueryField(q)
      case q: QueryOutputModifier =>
        suggestQueryOutputModifier(q).map(Future.successful)
    }.flatten

    Future.sequence(eventuallySuggestions)

  private def suggestQueryField(q: QueryField) =
    q match {
      case QueryField(keyToken, None) =>
        List(
          Future.successful(
            TypeaheadTextSuggestions(
              keyToken.start,
              keyToken.end,
              ":",
              suggestFieldKey(keyToken.literal.getOrElse(""))
            )
          )
        )
      case QueryField(keyToken, Some(valueToken)) =>
        val keySuggestions = Future.successful(
          TypeaheadTextSuggestions(
            keyToken.start,
            keyToken.end,
            ":",
            suggestFieldKey(keyToken.literal.getOrElse(""))
          )
        )
        val valueSuggestions =
          suggestFieldValue(
            keyToken.literal.getOrElse(""),
            valueToken.literal.getOrElse("")
          )
            .map { suggestions =>
              TypeaheadTextSuggestions(
                valueToken.start,
                valueToken.end,
                " ",
                suggestions
              )
            }
        List(keySuggestions, valueSuggestions)
    }

  private def suggestQueryOutputModifier(q: QueryOutputModifier) =
    q match {
      case QueryOutputModifier(keyToken, None) =>
        List(
          TypeaheadTextSuggestions(
            keyToken.start,
            keyToken.end,
            ":",
            suggestOutputModifierKey(keyToken.literal.getOrElse(""))
          )
        )
      case QueryOutputModifier(keyToken, Some(valueToken)) =>
        val keySuggestions =
          TypeaheadTextSuggestions(
            keyToken.start,
            keyToken.end,
            ":",
            suggestOutputModifierKey(keyToken.literal.getOrElse(""))
          )
        val valueSuggestions =
          TypeaheadTextSuggestions(
            valueToken.start,
            valueToken.end,
            " ",
            suggestOutputModifierValue(
              keyToken.literal.getOrElse(""),
              valueToken.literal.getOrElse("")
            )
          )
        List(keySuggestions, valueSuggestions)
    }

  private def suggestFieldKey(str: String): List[TypeaheadTextSuggestion] =
    str match
      case "" => typeaheadFieldResolverEntries
      case str =>
        typeaheadFieldResolverEntries
          .filter(_.value.contains(str.toLowerCase()))

  private def suggestFieldValue(
      key: String,
      str: String
  ): Future[List[TypeaheadTextSuggestion]] =
    typeaheadFieldResolverMap
      .get(key)
      .map(_._2(str))
      .getOrElse(Future.successful(List.empty))

  private def suggestOutputModifierKey(str: String): List[TypeaheadTextSuggestion] =
    typeaheadOutputModifierResolverEntries.filter(
      _.value.contains(str.toLowerCase())
    )

  private def suggestOutputModifierValue(
      key: String,
      str: String
  ): List[TypeaheadTextSuggestion] =
    typeaheadOutputModifierResolverMap
      .get(key)
      .getOrElse(List.empty)
      .filter(
        _.contains(
          str.toLowerCase()
        )
      )
      .map { str => TypeaheadTextSuggestion(str, str) }

  private def suggestTags(str: String) =
    client.getTags(str)

  private def suggestSections(str: String) =
    client.getSections(str)
}
