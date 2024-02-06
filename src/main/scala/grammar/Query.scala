package cql.grammar

import cql.Token
import io.circe._
import io.circe.generic.semiauto.deriveEncoder
import io.circe.Encoder
import io.circe.syntax._
import cql.TokenType
import cql.TypeaheadSuggestion

case class CqlResult(
    tokens: List[Token],
    ast: Option[QueryList],
    queryResult: Option[String],
    // Map from tokenType to a map of literals and their suggestions.
    // Avoiding TokenType as type to avoid serialisation shenanigans in prototype.
    suggestions: Map[String, Map[String, List[TypeaheadSuggestion]]],
    error: Option[String] = None
)

trait Query

case class QueryList(exprs: List[QueryBinary | QueryMeta]) extends Query
case class QueryBinary(
    left: QueryContent,
    right: Option[(Token, QueryContent)] = None
)
case class QueryContent(content: QueryStr | QueryBinary | QueryGroup)
case class QueryGroup(content: QueryBinary)
case class QueryStr(searchExpr: String) extends Query
case class QueryMeta(key: Option[String], value: Option[String]) extends Query

trait QueryJson {
  implicit val typeaheadSuggestion: Encoder[TypeaheadSuggestion] =
    deriveEncoder[TypeaheadSuggestion]
  implicit val cqlResultEncoder: Encoder[CqlResult] = deriveEncoder[CqlResult]
  implicit val queryListEncoder: Encoder[QueryList] = Encoder.instance { list =>
    val arr = list.exprs.map {
      case q: QueryBinary => q.asJson
      case q: QueryMeta   => q.asJson
    }
    Json.obj("type" -> "QueryList".asJson, "content" -> Json.arr(arr: _*))
  }
  implicit val queryGroupEncoder: Encoder[QueryGroup] = Encoder.instance {
    group =>
      group.content.asJson.deepMerge(Json.obj("type" -> "QueryGroup".asJson))
  }
  implicit val queryStrEncoder: Encoder[QueryStr] = Encoder.instance {
    queryStr =>
      Json.obj(
        "type" -> "QueryStr".asJson,
        "searchExpr" -> queryStr.searchExpr.asJson
      )
  }
  implicit val queryMetaEncoder: Encoder[QueryMeta] = Encoder.instance {
    queryMeta =>
      Json.obj(
        "type" -> "QueryMeta".asJson,
        "key" -> queryMeta.key.map(_.asJson).orNull,
        "value" -> queryMeta.value.map(_.asJson).orNull
      )
  }
  implicit val tokenEncoder: Encoder[Token] = Encoder.instance { token =>
    Json.obj(
      "type" -> "Token".asJson,
      "tokenType" -> token.tokenType.toString.asJson,
      "lexeme" -> token.lexeme.asJson,
      "start" -> token.start.asJson,
      "end" -> token.end.asJson,
      "literal" -> token.literal.asJson
    )
  }
  implicit val queryContentEncoder: Encoder[QueryContent] = Encoder.instance {
    queryContent =>
      val content = queryContent.content match {
        case q: QueryStr    => q.asJson
        case q: QueryBinary => q.asJson
        case q: QueryGroup  => q.asJson
      }

      content.deepMerge(Json.obj("type" -> "QueryContent".asJson))
  }
  implicit val queryBinaryEncoder: Encoder[QueryBinary] = Encoder.instance {
    queryBinary =>
      Json.obj(
        "type" -> "QueryBinary".asJson,
        ("left", queryBinary.left.asJson),
        ("right", queryBinary.right.asJson)
      )
  }
}
