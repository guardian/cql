package cql

import cql.TokenType
import scala.concurrent.Future
import concurrent.ExecutionContext.Implicits.global // Todo: sticking plaster
import cql.grammar.QueryMeta
import cql.grammar.QueryList

case class TypeaheadSuggestion(label: String, value: String)

class Typeahead(client: TypeaheadQueryCapiClient) {
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
  ): Future[Map[String, Map[String, List[cql.TypeaheadSuggestion]]]] =
    val suggestionFtrs = program.exprs.collect {
      case q: QueryMeta => q
    }.flatMap {
      case QueryMeta(key, None) => List(Future.successful((TokenType.QUERY_META_KEY, key, suggestMetaKey(key))))
      case QueryMeta(key, Some(value)) => List(
        Future.successful((TokenType.QUERY_META_KEY, key, suggestMetaKey(key))),
        suggestMetaValue(key, value).map((TokenType.QUERY_META_VALUE, value, _)),
      )
    }

    Future.sequence(suggestionFtrs).map { suggestionsForToken =>
      suggestionsForToken.foldLeft(
        Map.empty[String, Map[String, List[TypeaheadSuggestion]]]
      ) { case (acc, (tokenType, value, suggestions)) =>
        val existingSuggestions = acc.getOrElse(
          tokenType.toString,
          Map.empty[String, List[TypeaheadSuggestion]]
        )
        acc + (tokenType.toString -> (existingSuggestions + (value -> suggestions)))
      }
    }

  private def suggestMetaKey(str: String): List[TypeaheadSuggestion] =
    str match {
      case "" => typeaheadResolverEntries
      case str =>
        typeaheadResolverEntries.filter(_.value.contains(str.toLowerCase()))
    }

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
