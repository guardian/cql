package cql

enum TokenType:
  // Single-character tokens.
  case PLUS, COLON, LEFT_BRACKET, RIGHT_BRACKET,

    // Literals.
    STRING, NUMBER, QUERY_META_KEY, QUERY_META_VALUE,

    // Keywords.
    AND, OR, EOF

case class Token(
    tokenType: TokenType,
    lexeme: String,
    literal: Double | String | Null,
    start: Int,
    end: Int
):
  override def toString = s"${tokenType} ${lexeme} ${literal} ${start}-${end}"

object Token:
  val reservedWords = Map(
    "AND" -> TokenType.AND,
    "OR" -> TokenType.OR
  )
