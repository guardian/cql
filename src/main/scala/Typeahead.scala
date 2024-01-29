package cql

import com.gu.contentapi.client.ContentApiClient
import cql.TokenType

import scala.concurrent.Future

case class TypeaheadSuggestion(label: String, value: String)

class Typeahead(client: TypeaheadQueryCapiClient) {
  private val typeaheadTokenMap = Map(
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
  }

  def getSuggestions(tokens: List[Token]): Future[List[TypeaheadSuggestion]] = tokens.lastOption match {
    case Some(token) => typeaheadTokenMap.get(token.tokenType).map { _(token.literal) }
    case None => Future.successful(List.empty)
  }

  private def suggestMetaKey(token: Token): Future[List[TypeaheadSuggestion]] =
    val suggestions = token.literal match {
      case Some("") => typeaheadResolverEntries
      case Some(str) => typeaheadResolverEntries.filter(_.value.contains(str.toLowerCase()))
    }

    Future.successful(suggestions)

  private def suggestMetaValue(token: Token): Future[List[TypeaheadSuggestion]] = typeaheadResolverMap.get(token.literal).map(_._2(token))

  private def suggestTags(token: Token) =
    val tagStr = token.literal.getOrElse("");
    val query = ContentApiLogic
    client.
}
