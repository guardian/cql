package cql

import cql.TokenType
import scala.concurrent.Future
import concurrent.ExecutionContext.Implicits.global // Todo: sticking plaster

case class TypeaheadSuggestion(label: String, value: String)

class Typeahead(client: TypeaheadQueryCapiClient) {
  private val typeaheadTokenResolverMap = Map(
    TokenType.QUERY_META_KEY -> suggestMetaKey,
    TokenType.PLUS -> suggestMetaKey,
    TokenType.COLON -> suggestMetaValue,
    TokenType.QUERY_META_VALUE -> suggestMetaValue
  )

  private val typeaheadResolverMap = Map(
    "tag" -> ("Tag", suggestTags),
    "section" -> ("Section", suggestSections)
  )

  private val typeaheadResolverEntries = typeaheadResolverMap.map {
    case (value, (label, _)) => TypeaheadSuggestion(label, value)
  }.toList

  def getSuggestions(tokens: List[Token]): Future[Map[String, Map[String, List[cql.TypeaheadSuggestion]]]] =
    val suggestionFtrs = tokens.map { token =>
      typeaheadTokenResolverMap.get(token.tokenType).map { resolver =>
        resolver(token).map { suggestions =>
          (token, suggestions)
        }
      }.getOrElse(Future.failed(new Error("whups")))
    }

    Future.sequence(suggestionFtrs).map { suggestionsForToken =>
      suggestionsForToken.foldLeft(Map.empty[String, Map[String, List[TypeaheadSuggestion]]]) {
        case (acc, (token, suggestions)) =>
          val existingSuggestions = acc.getOrElse(token.tokenType.toString, Map.empty[String, List[TypeaheadSuggestion]])
          acc + (token.tokenType.toString -> (existingSuggestions + (token.lexeme -> suggestions)))
      }
    }

  private def suggestMetaKey(token: Token): Future[List[TypeaheadSuggestion]] =
    val suggestions = token.literal match {
      case Some("") => typeaheadResolverEntries
      case Some(str) => typeaheadResolverEntries.filter(_.value.contains(str.toLowerCase()))
    }

    Future.successful(suggestions)

  private def suggestMetaValue(token: Token): Future[List[TypeaheadSuggestion]] =
    typeaheadResolverMap.get(token.literal.getOrElse("")).map(_._2(token)).getOrElse(Future.failed(new Error("whups")))

  private def suggestTags(token: Token) =
    val tagStr = token.literal.getOrElse("")
    client.getTags(tagStr)

  private def suggestSections(token: Token) =
    val sectionStr = token.literal.getOrElse("")
    client.getSections(sectionStr)
}
