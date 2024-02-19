package cql

import scala.concurrent.Future
import concurrent.ExecutionContext.Implicits.global
import cql.grammar.QueryField
import cql.grammar.QueryList

case class TypeaheadSuggestions(
    from: Int,
    to: Int,
    // The suffix to apply if this suggestion is accepted at the trailing edge of the query.
    // E.g. when we have typed '+ta' accept the key suggestion 'tag', we'll want to apply '+tag:'
    // to trigger typeahead for the value.
    suffix: String = "",
    suggestions: List[TypeaheadSuggestion]
)
case class TypeaheadSuggestion(label: String, value: String)

class Typeahead(client: TypeaheadQueryClient) {
  private val typeaheadTokenResolverMap = Map(
    TokenType.QUERY_META_KEY -> suggestMetaKey,
    TokenType.QUERY_META_VALUE -> suggestMetaValue
  )

  private val typeaheadResolverMap = Map(
    "tag" -> ("Tag", suggestTags),
    "section" -> ("Section", suggestSections)
  )

  private val typeaheadResolverEntries = typeaheadResolverMap.map {
    case (value, (label, _)) => TypeaheadSuggestion(label, value)
  }.toList

  def getSuggestions(
      program: QueryList
  ): Future[List[TypeaheadSuggestions]] =
    val eventuallySuggestions = program.exprs
      .collect { case q: QueryField =>
        q
      }
      .flatMap {
        case QueryField(keyToken, None) =>
          List(
            Future.successful(
              TypeaheadSuggestions(
                keyToken.start,
                keyToken.end,
                ":",
                suggestMetaKey(keyToken.literal.getOrElse(""))
              )
            )
          )
        case QueryField(keyToken, Some(valueToken)) =>
          val keySuggestions = Future.successful(
            TypeaheadSuggestions(
              keyToken.start,
              keyToken.end,
              ":",
              suggestMetaKey(keyToken.literal.getOrElse(""))
            )
          )
          val valueSuggestions =
            suggestMetaValue(
              keyToken.literal.getOrElse(""),
              valueToken.literal.getOrElse("")
            )
              .map { suggestions =>
                TypeaheadSuggestions(
                  valueToken.start,
                  valueToken.end,
                  " ",
                  suggestions
                )
              }
          List(keySuggestions, valueSuggestions)
      }

    Future.sequence(eventuallySuggestions)

  private def suggestMetaKey(str: String): List[TypeaheadSuggestion] =
    str match
      case "" => typeaheadResolverEntries
      case str =>
        typeaheadResolverEntries
          .filter(_.value.contains(str.toLowerCase()))

  private def suggestMetaValue(
      key: String,
      str: String
  ): Future[List[TypeaheadSuggestion]] =
    typeaheadResolverMap
      .get(key)
      .map(_._2(str))
      .getOrElse(Future.successful(List.empty))

  private def suggestTags(str: String) =
    client.getTags(str)

  private def suggestSections(str: String) =
    client.getSections(str)
}
