package cql.lang

import TokenType.*

case class ParseError(position: Int, message: String)

object Parser:
  def parse(tokens: List[Token]): Either[ParseError, CqlQuery] =
    query(Cursor(tokens.toVector, 0))

  private type Result[+A] = Either[ParseError, (A, Cursor)]

  private val ok: Either[ParseError, Unit] = Right(())

  private case class Cursor(tokens: Vector[Token], pos: Int):
    // Treat running off the end of a token list with no EOF as reaching EOF
    def peek: Token =
      tokens.lift(pos).getOrElse {
        val end = tokens.lastOption.fold(0)(_.end)
        Token(EOF, "", None, end, end)
      }

    def isAtEnd: Boolean = peek.tokenType == EOF

    def check(tokenType: TokenType): Boolean =
      !isAtEnd && peek.tokenType == tokenType

    def next: Cursor = copy(pos = pos + 1)

    def advance: (Token, Cursor) = (peek, next)

    def error(message: String): ParseError = ParseError(peek.start, message)

    def unexpectedTokenError: ParseError =
      val location =
        if pos == 0 then "here." else s"after `${tokens(pos - 1).lexeme}`"
      error(s"I didn't expect to find a `${peek.lexeme}` $location")

  // query -> expr?
  private def query(cursor: Cursor): Either[ParseError, CqlQuery] =
    val content: Result[Option[CqlBinary]] =
      if cursor.isAtEnd then Right((None, cursor))
      else logicalOr(cursor).map((binary, next) => (Some(binary), next))

    for
      (maybeBinary, next) <- content
      _ <- Either.cond(next.isAtEnd, (), next.unexpectedTokenError)
    yield CqlQuery(maybeBinary)

  // logical_or -> logical_and ('OR'? logical_and)*
  private def logicalOr(
      cursor: Cursor,
      isNested: Boolean = false
  ): Result[CqlBinary] =
    def guardNested(cursor: Cursor) =
      if isNested then guardAgainstCqlField(cursor, "within a group") else ok

    def loop(left: CqlExpr, cursor: Cursor): Result[CqlExpr] =
      guardNested(cursor).flatMap { _ =>
        cursor.peek.tokenType match
          case EOF | RIGHT_BRACKET => Right((left, cursor))
          case OR =>
            operatorAndOperand(cursor, logicalAnd).flatMap((right, next) =>
              loop(CqlBinary(left, Some(right)), next)
            )
          // OR is implicit when two expressions are adjacent
          case _ =>
            logicalAnd(cursor).flatMap { (expr, next) =>
              val right = CqlBinaryRight(CqlBinaryOperator(OR, ""), expr)
              loop(CqlBinary(left, Some(right)), next)
            }
      }

    for
      _ <- guardNested(cursor)
      _ <- Either.cond(
        cursor.peek.tokenType != CHIP_VALUE,
        (),
        cursor.error(
          "I found an unexpected `:`. Did you intend to search for a field, e.g. `tag:news`? If you would like to add a search phrase containing a `:` character, please surround it in double quotes."
        )
      )
      (first, afterFirst) <- logicalAnd(cursor)
      (expr, next) <- loop(first, afterFirst)
    yield
      val binary = expr match
        case binary: CqlBinary => binary
        case other             => CqlBinary(other)
      (binary, next)

  // logical_and -> unary ('AND' unary)*
  private def logicalAnd(cursor: Cursor): Result[CqlExpr] =
    def loop(left: CqlExpr, cursor: Cursor): Result[CqlExpr] =
      if cursor.check(AND) then
        operatorAndOperand(cursor, unary).flatMap((right, next) =>
          loop(CqlBinary(left, Some(right)), next)
        )
      else Right((left, cursor))

    unary(cursor).flatMap((expr, next) => loop(expr, next))

  /** Consume an explicit binary operator and the operand that must follow it. */
  private def operatorAndOperand(
      cursor: Cursor,
      operand: Cursor => Result[CqlExpr]
  ): Result[CqlBinaryRight] =
    val (operator, afterOperator) = cursor.advance
    for
      _ <- guardAgainstCqlField(afterOperator, s"after `${operator.tokenType}`.")
      _ <- guardAgainstEof(afterOperator, operator)
      (expr, next) <- operand(afterOperator)
    yield (
      CqlBinaryRight(CqlBinaryOperator(operator.tokenType, operator.lexeme), expr),
      next
    )

  // unary -> ('-' | '+')? primary
  private def unary(cursor: Cursor): Result[CqlExpr] =
    val (polarity, afterPolarity) = cursor.peek.tokenType match
      case MINUS => (Polarity.NEGATIVE, cursor.next)
      case PLUS  => (Polarity.POSITIVE, cursor.next)
      case _     => (Polarity.POSITIVE, cursor)

    primary(afterPolarity).map((primary, next) =>
      (CqlUnary(primary, polarity), next)
    )

  // primary -> group | str | field
  private def primary(cursor: Cursor): Result[CqlPrimary] =
    cursor.peek.tokenType match
      case LEFT_BRACKET => group(cursor)
      case STRING       => str(cursor)
      case CHIP_KEY     => field(cursor)
      case tokenType @ (AND | OR) =>
        Left(
          cursor.error(
            s"An `$tokenType` keyword must have a search term before and after it, e.g. `this $tokenType that`."
          )
        )
      case _ => Left(cursor.unexpectedTokenError)

  private def group(cursor: Cursor): Result[CqlGroup] =
    for
      (_, afterBracket) <- consume(
        cursor,
        LEFT_BRACKET,
        "Groups should start with a left bracket"
      )
      _ <- Either.cond(
        !afterBracket.isAtEnd && afterBracket.peek.tokenType != RIGHT_BRACKET,
        (),
        afterBracket.error(
          "Groups can't be empty. Put a search term between the brackets!"
        )
      )
      _ <- guardAgainstCqlField(
        afterBracket,
        "within a group. Try putting this search term outside of the brackets!"
      )
      (content, afterContent) <- logicalOr(afterBracket, isNested = true)
      (_, next) <- consume(
        afterContent,
        RIGHT_BRACKET,
        "Groups must end with a right bracket."
      )
    yield (CqlGroup(content), next)

  private def str(cursor: Cursor): Result[CqlStr] =
    consume(cursor, STRING, "Expected a string").map((token, next) =>
      (CqlStr(token), next)
    )

  private def field(cursor: Cursor): Result[CqlField] =
    consume(cursor, CHIP_KEY, "Expected a search key, e.g. `+tag`").map {
      (key, afterKey) =>
        if afterKey.check(CHIP_VALUE) then
          val (value, next) = afterKey.advance
          (CqlField(key, Some(value)), next)
        else (CqlField(key, None), afterKey)
    }

  /** Fail with a sensible parse error when a query field is found in the wrong
    * place.
    */
  private def guardAgainstCqlField(
      cursor: Cursor,
      errorLocation: String
  ): Either[ParseError, Unit] =
    if cursor.peek.tokenType == CHIP_KEY then
      field(cursor).flatMap((queryField, next) =>
        Left(
          next.error(
            s"You cannot query for the field `${queryField.key.literal.getOrElse("")}` $errorLocation. Try putting this search term outside of the brackets!"
          )
        )
      )
    else ok

  private def guardAgainstEof(
      cursor: Cursor,
      previousToken: Token
  ): Either[ParseError, Unit] =
    Either.cond(
      !cursor.isAtEnd,
      (),
      cursor.error(s"I expected something else after `${previousToken.lexeme}`")
    )

  private def consume(
      cursor: Cursor,
      tokenType: TokenType,
      message: String
  ): Result[Token] =
    if cursor.check(tokenType) then Right(cursor.advance)
    else Left(cursor.error(message))

