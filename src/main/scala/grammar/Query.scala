package cql.grammar

import cql.Token
import io.circe._
import io.circe.generic.semiauto.deriveEncoder
import io.circe.Encoder
import io.circe.syntax._

case class CqlResult(tokens: List[Token], ast: Option[QueryList], queryResult: Option[String], error: Option[String] = None)

trait Query

case class QueryList(exprs: List[QueryBinary | QueryMeta]) extends Query
case class QueryBinary(left: QueryStr, right: Option[(Token, QueryContent)] = None)
case class QueryContent(content: QueryStr | QueryBinary | QueryGroup)
case class QueryGroup(content: QueryBinary)
case class QueryStr(searchExpr: String) extends Query
case class QueryMeta(key: String, value: String) extends Query

trait QueryJson {
  implicit val cqlResultEncoder: Encoder[CqlResult] = deriveEncoder[CqlResult]
  implicit val queryListEncoder: Encoder[QueryList] = Encoder.instance { list =>
    val arr = list.exprs.map {
      case q: QueryBinary => q.asJson
      case q: QueryMeta => q.asJson
    }
    Json.obj("content" -> Json.arr(arr: _*))
  }
  implicit val queryGroupEncoder: Encoder[QueryGroup] = deriveEncoder[QueryGroup]
  implicit val queryStrEncoder: Encoder[QueryStr] = deriveEncoder[QueryStr]
  implicit val queryMetaEncoder: Encoder[QueryMeta] = deriveEncoder[QueryMeta]
  implicit val tokenEncoder: Encoder[Token] = Encoder.instance { token =>
    Json.obj(
      "lexeme" -> token.lexeme.asJson,
      "start" -> token.start.asJson,
      "end" -> token.end.asJson,
      "literal" -> token.literal.asJson
    )
  }
  implicit val queryContentEncoder: Encoder[QueryContent] = Encoder.instance { queryContent =>
    queryContent.content match {
      case q: QueryStr => q.asJson
      case q: QueryBinary => q.asJson
      case q: QueryGroup => q.asJson
    }
  }
  implicit val queryBinaryEncoder: Encoder[QueryBinary] = Encoder.instance { queryBinary =>
    Json.obj(
      ("left", queryBinary.left.asJson),
      ("right", queryBinary.right.asJson)
    )
  }
}
