package cql

enum TokenType:
  // Single-character tokens.
  case PLUS, COLON, LEFT_QUOTE, RIGHT_QUOTE,

    // One or two character tokens.
    GREATER, GREATER_EQUAL,
    LESS, LESS_EQUAL,

    // Literals.
    STRING, NUMBER,

    // Keywords.
    TAG, SECTION, FROM, TO, EOF

case class Token(
    tokenType: TokenType,
    lexeme: String,
    literal: Double | String | Null,
    line: Int
):
  override def toString = s"${tokenType} ${lexeme} ${literal} ${line}"

object Token:
  val reservedWords = Map(
    "tag" -> TokenType.TAG,
    "section" -> TokenType.SECTION,
    "from" -> TokenType.FROM,
    "to" -> TokenType.TO,
    "+" -> TokenType.PLUS,
    ":" -> TokenType.COLON
  )
