package cql

enum TokenType:
  // Single-character tokens.
  case PLUS, COLON, AT, LEFT_BRACKET, RIGHT_BRACKET,

    // Literals.
    STRING, NUMBER, QUERY_OUTPUT_MODIFIER_KEY, QUERY_FIELD_KEY, QUERY_VALUE,

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
