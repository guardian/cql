package cql.lang

import io.circe.Encoder
import io.circe.syntax._
import io.circe.Json

trait Query

object QueryList {
  implicit val encoder: Encoder[QueryList] = Encoder.instance { list =>
    val arr = list.exprs.map {
      case q: CqlBinary         => q.asJson
      case q: QueryField          => q.asJson
      case q: QueryOutputModifier => q.asJson
    }
    Json.obj("type" -> "QueryList".asJson, "content" -> Json.arr(arr*))
  }
}
case class QueryList(
    exprs: List[CqlBinary | QueryField | QueryOutputModifier]
) extends Query

object CqlBinary {
  implicit val encoder: Encoder[CqlBinary] = Encoder.instance { queryBinary =>
    Json.obj(
      "type" -> "CqlBinary".asJson,
      ("left", queryBinary.left.asJson),
      ("right", queryBinary.right.asJson)
    )
  }
}
case class CqlBinary(
    left: QueryContent,
    right: Option[(Token, CqlBinary)] = None
)

object QueryContent {
  implicit val encoder: Encoder[QueryContent] = Encoder.instance {
    queryContent =>
      val content = queryContent.content match {
        case q: QueryStr    => q.asJson
        case q: CqlBinary => q.asJson
        case q: QueryGroup  => q.asJson
      }

      content.deepMerge(Json.obj("type" -> "QueryContent".asJson))
  }
}

case class QueryContent(content: QueryStr | CqlBinary | QueryGroup)

object QueryGroup {
  implicit val encoder: Encoder[QueryGroup] = Encoder.instance { group =>
    group.content.asJson.deepMerge(Json.obj("type" -> "QueryGroup".asJson))
  }
}

case class QueryGroup(content: CqlBinary)

object QueryStr {
  implicit val encoder: Encoder[QueryStr] = Encoder.instance { queryStr =>
    Json.obj(
      "type" -> "QueryStr".asJson,
      "searchExpr" -> queryStr.searchExpr.asJson
    )
  }
}

case class QueryStr(searchExpr: String) extends Query
object QueryField {
  implicit val encoder: Encoder[QueryField] = Encoder.instance { queryField =>
    Json.obj(
      "type" -> "QueryField".asJson,
      "key" -> queryField.key.asJson,
      "value" -> queryField.value.asJson
    )
  }
}

case class QueryField(key: Token, value: Option[Token]) extends Query

object QueryOutputModifier {
  implicit val encoder: Encoder[QueryOutputModifier] =
    Encoder.instance { queryField =>
      Json.obj(
        "type" -> "QueryOutputModifier".asJson,
        "key" -> queryField.key.asJson,
        "value" -> queryField.value.asJson
      )
    }
}

case class QueryOutputModifier(key: Token, value: Option[Token]) extends Query
