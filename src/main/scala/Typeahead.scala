package cql

import scala.concurrent.Future
import concurrent.ExecutionContext.Implicits.global
import cql.grammar.QueryField
import cql.grammar.QueryList
import cql.grammar.QueryOutputModifier

case class TypeaheadSuggestion(
    from: Int,
    to: Int,
    // The suffix to apply if this suggestion is accepted at the trailing edge of the query.
    // E.g. when we have typed '+ta' accept the key suggestion 'tag', we'll want to apply '+tag:'
    // to trigger typeahead for the value.
    suffix: String = "",
    suggestions: Suggestions
)

sealed trait Suggestions

case class TextSuggestion(suggestions: List[TextSuggestionOption]) extends Suggestions
case class TextSuggestionOption(label: String, value: String)

case class DateSuggestion(validFrom: Option[String], validTo: Option[String]) extends Suggestions

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

  private val typeaheadFieldResolverEntries = TextSuggestion(
    typeaheadFieldResolverMap.map { case (value, (label, _)) =>
      TextSuggestionOption(label, value)
    }.toList
  )

  private val typeaheadOutputModifierResolverMap
      : Map[String, ("TEXT" | "DATE", List[String])] = Map(
    "show-fields" -> ("TEXT", List(
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
    )),
    "from-date" -> ("DATE", List.empty),
    "to-date" -> ("DATE", List.empty)
  )

  private val typeaheadOutputModifierResolverEntries =
    typeaheadOutputModifierResolverMap.keys.map { case key =>
      TextSuggestionOption(key, key)
    }.toList

  def getSuggestions(
      program: QueryList
  ): Future[List[TypeaheadSuggestion]] =
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
            TypeaheadSuggestion(
              keyToken.start,
              keyToken.end,
              ":",
              suggestFieldKey(keyToken.literal.getOrElse(""))
            )
          )
        )
      case QueryField(keyToken, Some(valueToken)) =>
        val keySuggestions = Future.successful(
          TypeaheadSuggestion(
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
              TypeaheadSuggestion(
                valueToken.start,
                valueToken.end,
                " ",
                TextSuggestion(suggestions)
              )
            }
        List(keySuggestions, valueSuggestions)
    }

  private def suggestQueryOutputModifier(q: QueryOutputModifier) =
    q match {
      case QueryOutputModifier(keyToken, None) =>
        List(
          TypeaheadSuggestion(
            keyToken.start,
            keyToken.end,
            ":",
            suggestOutputModifierKey(keyToken.literal.getOrElse(""))
          )
        )
      case QueryOutputModifier(keyToken, Some(valueToken)) =>
        val keySuggestions =
          TypeaheadSuggestion(
            keyToken.start,
            keyToken.end,
            ":",
            suggestOutputModifierKey(keyToken.literal.getOrElse(""))
          )
        val valueSuggestions =
          TypeaheadSuggestion(
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

  private def suggestFieldKey(str: String): TextSuggestion =
    str match
      case "" => typeaheadFieldResolverEntries
      case str =>
        typeaheadFieldResolverEntries.copy(
          suggestions = typeaheadFieldResolverEntries.suggestions
            .filter(_.value.contains(str.toLowerCase()))
        )

  private def suggestFieldValue(
      key: String,
      str: String
  ): Future[List[TextSuggestionOption]] =
    typeaheadFieldResolverMap
      .get(key)
      .map(_._2(str))
      .getOrElse(Future.successful(List.empty))

  private def suggestOutputModifierKey(str: String): TextSuggestion =
    TextSuggestion(
      typeaheadOutputModifierResolverEntries.filter(
        _.value.contains(str.toLowerCase())
      )
    )

  private def suggestOutputModifierValue(
      key: String,
      str: String
  ): TextSuggestion | DateSuggestion =
    typeaheadOutputModifierResolverMap.get(key) match
      case Some("TEXT", suggestions) =>
        TextSuggestion(
          suggestions
            .filter(
              _.contains(
                str.toLowerCase()
              )
            )
            .map { str => TextSuggestionOption(str, str) }
        )
      // Todo: date validation based on rest of AST
      case Some("DATE", _) => DateSuggestion(None, None)
      case None            => TextSuggestion(List.empty)

  private def suggestTags(str: String) =
    client.getTags(str)

  private def suggestSections(str: String) =
    client.getSections(str)
}
