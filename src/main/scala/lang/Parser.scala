package cql.lang

import scala.util.Try

import TokenType.*

case class ParseError(position: Int, message: String) extends Error(message)

class Parser(tokens: List[Token]):
  private var current: Int = 0

  def parse(): Try[CqlQuery] =
    Try { query() }

  // query -> expr?
  private def query(): CqlQuery =
    val content =
      if (peek().tokenType == EOF) None else Some(logicalOr())

    if (peek().tokenType != EOF)
      throw unexpectedTokenError()

    CqlQuery(content)

  // logical_or -> logical_and ('OR'? logical_and)*
  private def logicalOr(isNested: Boolean = false): CqlBinary =
    if (isNested)
      guardAgainstCqlField("within a group")

    if (peek().tokenType == CHIP_VALUE)
      throw ParseError(
        peek().start,
        "I found an unexpected `:`. Did you intend to search for a field, e.g. `tag:news`? If you would like to add a search phrase containing a `:` character, please surround it in double quotes."
      )

    var left: CqlExpr = logicalAnd()
    var nextToken: Option[Token] = None

    while (
      !nextToken.map(_.tokenType).contains(EOF) &&
      !nextToken.map(_.tokenType).contains(RIGHT_BRACKET)
    ) {
      val token = peek()
      nextToken = Some(token)

      if (isNested)
        guardAgainstCqlField("within a group")

      token.tokenType match {
        case OR =>
          consume(OR)
          guardAgainstCqlField(s"after `${token.tokenType}`.")
          guardAgainstEof(token)
          left = CqlBinary(
            left,
            Some(
              CqlBinaryRight(
                CqlBinaryOperator(token.tokenType, token.lexeme),
                logicalAnd()
              )
            )
          )
        case EOF | RIGHT_BRACKET =>
          ()
        // OR is implicit when two expressions are adjacent
        case _ =>
          left = CqlBinary(
            left,
            Some(CqlBinaryRight(CqlBinaryOperator(OR, ""), logicalAnd()))
          )
      }
    }

    left match {
      case binary: CqlBinary => binary
      case other             => CqlBinary(other)
    }

  // logical_and -> unary ('AND' unary)*
  private def logicalAnd(): CqlExpr =
    var left: CqlExpr = unary()
    var nextToken = peek()

    while (nextToken.tokenType == AND) {
      consume(AND)
      guardAgainstCqlField(s"after `${nextToken.tokenType}`.")
      guardAgainstEof(nextToken)
      left = CqlBinary(
        left,
        Some(
          CqlBinaryRight(
            CqlBinaryOperator(nextToken.tokenType, nextToken.lexeme),
            unary()
          )
        )
      )
      nextToken = peek()
    }

    left

  // unary -> ('-' | '+')? primary
  private def unary(): CqlExpr =
    val maybeNegation = consumeMany(List(MINUS, PLUS))
    val polarity =
      maybeNegation match {
        case Some(token) if token.tokenType == MINUS => Polarity.NEGATIVE
        case _                                       => Polarity.POSITIVE
      }

    CqlUnary(primary(), polarity)

  // primary -> group | str | field
  private def primary(): CqlPrimary =
    peek().tokenType match {
      case LEFT_BRACKET => group()
      case STRING       => str()
      case CHIP_KEY     => field()
      case tokenType @ (AND | OR) =>
        throw error(
          s"An `${tokenType.toString}` keyword must have a search term before and after it, e.g. `this ${tokenType.toString} that`."
        )
      case _ =>
        throw unexpectedTokenError()
    }

  private def group(): CqlGroup =
    consume(LEFT_BRACKET, "Groups should start with a left bracket")

    if (isAtEnd || peek().tokenType == RIGHT_BRACKET)
      throw error(
        "Groups can't be empty. Put a search term between the brackets!"
      )

    guardAgainstCqlField(
      "within a group. Try putting this search term outside of the brackets!"
    )

    val content = logicalOr(true)
    consume(RIGHT_BRACKET, "Groups must end with a right bracket.")

    CqlGroup(content)

  private def str(): CqlStr =
    CqlStr(consume(STRING, "Expected a string"))

  private def field(): CqlField =
    val key = consume(TokenType.CHIP_KEY, "Expected a search key, e.g. `+tag`")
    val value = safeConsume(
      TokenType.CHIP_VALUE,
      "Expected a search value, e.g. `+tag:new`"
    )

    CqlField(key, value)

  /** Throw a sensible parse error when a query field is found in the wrong
    * place.
    */
  private def guardAgainstCqlField(errorLocation: String): Unit =
    if (peek().tokenType == CHIP_KEY) {
      val queryFieldNode = field()
      throw error(
        s"You cannot query for the field `${queryFieldNode.key.literal
            .getOrElse("")}` ${errorLocation}. Try putting this search term outside of the brackets!"
      )
    }

  private def guardAgainstEof(previousToken: Token): Unit =
    if (isAtEnd)
      throw error(
        s"I expected something else after `${previousToken.lexeme}`"
      )

  private def check(tokenType: TokenType): Boolean =
    if (isAtEnd) false else peek().tokenType == tokenType

  private def isAtEnd: Boolean = peek().tokenType == EOF

  private def peek(): Token = tokens(current)

  private def advance(): Token =
    if (!isAtEnd) {
      val currentToken = tokens(current)
      current = current + 1
      currentToken
    } else previous()

  private def consume(tokenType: TokenType, message: String = ""): Token =
    if (check(tokenType)) advance()
    else throw error(message)

  private def consumeMany(tokenTypes: List[TokenType]): Option[Token] =
    if (tokenTypes.exists(check)) Some(advance()) else None

  private def safeConsume(
      tokenType: TokenType,
      message: String = ""
  ): Option[Token] =
    if (check(tokenType)) Some(advance()) else None

  private def previous(): Token = tokens(current - 1)

  private def error(message: String): ParseError =
    ParseError(peek().start, message)

  private def unexpectedTokenError(): ParseError =
    val location =
      if (current == 0) "here."
      else s"after `${previous().lexeme}`"
    error(s"I didn't expect to find a `${peek().lexeme}` ${location}")

