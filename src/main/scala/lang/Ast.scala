package cql.lang

import io.circe.Encoder
import io.circe.syntax._
import io.circe.Json

trait Query

object QueryList {
  implicit val encoder: Encoder[QueryList] = Encoder.instance { list =>
    val arr = list.exprs.map {
      case q: CqlBinary         => q.asJson
      case q: CqlField          => q.asJson
      case q: QueryOutputModifier => q.asJson
    }
    Json.obj("type" -> "QueryList".asJson, "content" -> Json.arr(arr*))
  }
}
case class QueryList(
    exprs: List[CqlBinary | CqlField | QueryOutputModifier]
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
    left: QueryExpr,
    right: Option[(Token, CqlBinary)] = None
)

object QueryExpr {
  implicit val encoder: Encoder[QueryExpr] = Encoder.instance {
    queryContent =>
      val content = queryContent.content match {
        case q: CqlStr    => q.asJson
        case q: CqlBinary => q.asJson
        case q: CqlGroup  => q.asJson
      }

      content.deepMerge(Json.obj("type" -> "QueryExpr".asJson))
  }
}

case class QueryExpr(content: CqlStr | CqlBinary | CqlGroup)

object CqlGroup {
  implicit val encoder: Encoder[CqlGroup] = Encoder.instance { group =>
    group.content.asJson.deepMerge(Json.obj("type" -> "CqlGroup".asJson))
  }
}

case class CqlGroup(content: CqlBinary)

object CqlStr {
  implicit val encoder: Encoder[CqlStr] = Encoder.instance { queryStr =>
    Json.obj(
      "type" -> "CqlStr".asJson,
      "searchExpr" -> queryStr.searchExpr.asJson
    )
  }
}

case class CqlStr(searchExpr: String) extends Query
object CqlField {
  implicit val encoder: Encoder[CqlField] = Encoder.instance { queryField =>
    Json.obj(
      "type" -> "CqlField".asJson,
      "key" -> queryField.key.asJson,
      "value" -> queryField.value.asJson
    )
  }
}

case class CqlField(key: Token, value: Option[Token]) extends Query

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
