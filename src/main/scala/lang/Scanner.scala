package cql.lang

import scala.util.Try

class Scanner(program: String):
  var tokens: List[Token] = List.empty
  var start = 0
  var current = 0
  var line = 1
  var hasError = false;
  var reservedChars = "+@:()\""

  def scanTokens: List[Token] =
    while (!isAtEnd) {
      // We are at the beginning of the next lexeme.
      start = current;
      scanToken
    }

    println(tokens.map(_.lexeme))
    println(joinStringTokens(tokens).map(_.lexeme))

    joinStringTokens(tokens) :+ Token(TokenType.EOF, "", None, current, current)

  def joinStringTokens(tokens: List[Token]) = tokens.foldLeft(
    List.empty[Token]
  )((acc, token) => {
    (acc.lastOption, token.tokenType) match {
      case (Some(prevToken), TokenType.STRING)
          if prevToken.tokenType == TokenType.STRING =>
        acc.slice(0, acc.length - 1) :+ Token(
          TokenType.STRING,
          lexeme = prevToken.lexeme + " " + token.lexeme,
          literal = Some(
            prevToken.literal.getOrElse("") + " " + token.literal.getOrElse("")
          ),
          prevToken.start,
          token.end
        )
      case _ => acc :+ token
    }
  })

  def isAtEnd = current == program.size

  def scanToken =
    advance match {
      case '+' =>
        addKey(TokenType.QUERY_FIELD_KEY)
      case '@' =>
        addKey(TokenType.QUERY_OUTPUT_MODIFIER_KEY)
      case ':' =>
        addValue
      case '(' =>
        addToken(TokenType.LEFT_BRACKET)
      case ')' =>
        addToken(TokenType.RIGHT_BRACKET)
      case ' '  => ()
      case '\r' => ()
      case '\t' => ()
      case '\n' =>
        line = line + 1
      case '"'                 => addString
      case _ if isReservedWord => addIdentifier
      case _                   => addUnquotedString
    }

  def addKey(tokenType: TokenType) =
    while ((peek != ':' && !peek.isWhitespace) && !isAtEnd)
      advance

    if (current - start == 1) addToken(tokenType)
    else
      val key = program.substring(start + 1, current)
      addToken(tokenType, Some(key))

  def addValue =
    while ((!peek.isWhitespace) && !isAtEnd)
      advance

    if (current - start == 1) addToken(TokenType.QUERY_VALUE, None)
    else
      val value = program.substring(start + 1, current)
      addToken(TokenType.QUERY_VALUE, Some(value))

  def isReservedWord =
    Token.reservedWords.exists { case (str, _) =>
      program.substring(start).startsWith(str)
    }

  def addIdentifier =
    while (peek.isLetterOrDigit) advance
    val text = program.substring(start, current)
    Token.reservedWords.get(text) match {
      case Some(token) => addToken(token)
      case None        => error(line, "Expected identifier")
    }

  def addUnquotedString =
    while (!peek.isWhitespace && peek != ')' && !isAtEnd)
      advance

    addToken(TokenType.STRING, Some(program.substring(start, current)))

  def addString =
    while ((peek != '"') && !isAtEnd)
      advance

    if (isAtEnd) error(line, "Unterminated string at end of file")
    else
      advance
      addToken(
        TokenType.STRING,
        Some(program.substring(start + 1, current - 1))
      )

  def addToken(tokenType: TokenType, literal: Option[String] = None) =
    val text = program.substring(start, current)
    println(s"text${text}")
    tokens = tokens :+ Token(tokenType, text, literal, start, current - 1)

  def advance =
    val previous = current
    current = current + 1
    program(previous)

  def matchChar(expected: Char) =
    if (isAtEnd || program(current) != expected) false
    else
      current = current + 1
      true

  def peek = if (isAtEnd) '\u0000' else program(current)
  def peekNext =
    if (current + 1 >= program.size) '\u0000' else program.charAt(current + 1)

  def error(line: Int, message: String) = report(line, "", message)

  def report(line: Int, where: String, message: String) =
    println(s"[line ${line}] Error${where}: ${message}")
    hasError = true;
