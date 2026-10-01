package cql.lang

import io.circe.Encoder
import io.circe.Json
import io.circe.syntax._

enum TokenType:
  // Single-character tokens.
  case LEFT_BRACKET, RIGHT_BRACKET, MINUS, PLUS,

    // Literals.
    STRING, CHIP_KEY, CHIP_VALUE,

    // Keywords.
    AND, OR, EOF

case class Token(
    tokenType: TokenType,
    lexeme: String,
    literal: Option[String],
    start: Int,
    end: Int
):
  override def toString = s"${tokenType} ${lexeme} ${literal} ${start}-${end}"

object Token:
  val reservedWords = Map(
    "AND" -> TokenType.AND,
    "OR" -> TokenType.OR
  )

  given Encoder[Token] = Encoder.instance { token =>
    Json.obj(
      "type" -> "Token".asJson,
      "tokenType" -> token.tokenType.toString.asJson,
      "lexeme" -> token.lexeme.asJson,
      "start" -> token.start.asJson,
      "end" -> token.end.asJson,
      "literal" -> token.literal.asJson
    )
  }
