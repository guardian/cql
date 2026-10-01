package cql.lang

import io.circe.Encoder
import io.circe.syntax._
import io.circe.Json

enum Polarity:
  case POSITIVE, NEGATIVE

object Polarity:
  given Encoder[Polarity] = Encoder.encodeString.contramap(_.toString)

type CqlExpr = CqlBinary | CqlUnary

type CqlPrimary = CqlGroup | CqlStr | CqlField

case class CqlBinaryOperator(tokenType: TokenType, lexeme: String)

object CqlBinaryOperator:
  given Encoder[CqlBinaryOperator] = Encoder.instance { op =>
    Json.obj(
      "tokenType" -> op.tokenType.toString.asJson,
      "lexeme" -> op.lexeme.asJson
    )
  }

case class CqlBinaryRight(operator: CqlBinaryOperator, expr: CqlExpr)

object CqlBinaryRight:
  given Encoder[CqlBinaryRight] = Encoder.instance { right =>
    Json.obj(
      "operator" -> right.operator.asJson,
      "expr" -> right.expr.asJson
    )
  }

case class CqlBinary(left: CqlExpr, right: Option[CqlBinaryRight] = None)

case class CqlUnary(
    primary: CqlPrimary,
    polarity: Polarity = Polarity.POSITIVE
)

case class CqlGroup(content: CqlExpr)

case class CqlStr(token: Token):
  val searchExpr: String = token.literal.getOrElse("")

object CqlStr:
  given Encoder[CqlStr] = Encoder.instance { str =>
    Json.obj(
      "type" -> "CqlStr".asJson,
      "searchExpr" -> str.searchExpr.asJson
    )
  }

case class CqlField(key: Token, value: Option[Token] = None)

object CqlField:
  given Encoder[CqlField] = Encoder.instance { field =>
    Json.obj(
      "type" -> "CqlField".asJson,
      "key" -> field.key.asJson,
      "value" -> field.value.asJson
    )
  }

case class CqlQuery(content: Option[CqlBinary] = None)

// Encoders for the mutually-recursive AST nodes, defined together as lazy
// givens so the cross-references between them resolve safely.
given exprEncoder: Encoder[CqlExpr] = Encoder.instance {
  case b: CqlBinary => binaryEncoder(b)
  case u: CqlUnary  => unaryEncoder(u)
}

given primaryEncoder: Encoder[CqlPrimary] = Encoder.instance {
  case g: CqlGroup => groupEncoder(g)
  case s: CqlStr   => s.asJson
  case f: CqlField => f.asJson
}

given binaryEncoder: Encoder[CqlBinary] = Encoder.instance { binary =>
  Json.obj(
    "type" -> "CqlBinary".asJson,
    "left" -> binary.left.asJson,
    "right" -> binary.right.asJson
  )
}

given unaryEncoder: Encoder[CqlUnary] = Encoder.instance { unary =>
  Json.obj(
    "type" -> "CqlUnary".asJson,
    "primary" -> unary.primary.asJson,
    "polarity" -> unary.polarity.asJson
  )
}

given groupEncoder: Encoder[CqlGroup] = Encoder.instance { group =>
  Json.obj(
    "type" -> "CqlGroup".asJson,
    "content" -> group.content.asJson
  )
}

given queryEncoder: Encoder[CqlQuery] = Encoder.instance { query =>
  Json.obj(
    "type" -> "CqlQuery".asJson,
    "content" -> query.content.asJson
  )
}
