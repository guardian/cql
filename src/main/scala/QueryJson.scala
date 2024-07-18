package cql

import io.circe._
import io.circe.generic.semiauto.deriveEncoder
import io.circe.Encoder
import io.circe.syntax._

import cql.lang.{
  Token,
  TokenType,
  TypeaheadSuggestion,
  TextSuggestion,
  TextSuggestionOption,
  DateSuggestion,
  QueryList,
  QueryBinary,
  QueryField,
  QueryOutputModifier,
  QueryGroup,
  QueryStr,
  QueryContent,
  CqlResult
}

trait QueryJson {
  implicit val typeaheadSuggestions: Encoder[TypeaheadSuggestion] =
    deriveEncoder[TypeaheadSuggestion]
  implicit val typeaheadTextSuggestion: Encoder[TextSuggestion] =
    deriveEncoder[TextSuggestion]
  implicit val typeaheadDateSuggestion: Encoder[DateSuggestion] =
    deriveEncoder[DateSuggestion]
  implicit val textSuggestionOption: Encoder[TextSuggestionOption] =
    deriveEncoder[TextSuggestionOption]

  implicit val cqlResultEncoder: Encoder[CqlResult] = deriveEncoder[CqlResult]
  implicit val queryListEncoder: Encoder[QueryList] = Encoder.instance { list =>
    val arr = list.exprs.map {
      case q: QueryBinary         => q.asJson
      case q: QueryField          => q.asJson
      case q: QueryOutputModifier => q.asJson
    }
    Json.obj("type" -> "QueryList".asJson, "content" -> Json.arr(arr*))
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
  implicit val queryFieldEncoder: Encoder[QueryField] = Encoder.instance {
    queryField =>
      Json.obj(
        "type" -> "QueryField".asJson,
        "key" -> queryField.key.asJson,
        "value" -> queryField.value.asJson
      )
  }
  implicit val queryOutputModifierEncoder: Encoder[QueryOutputModifier] =
    Encoder.instance { queryField =>
      Json.obj(
        "type" -> "QueryOutputModifier".asJson,
        "key" -> queryField.key.asJson,
        "value" -> queryField.value.asJson
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
