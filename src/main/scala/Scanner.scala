package cql

import scala.util.Try

class Scanner(program: String):
  println(s"Scanning program: $program")
  var tokens: List[Token] = List.empty
  var start = 0
  var current = 0
  var line = 1
  var hasError = false;

  def scanTokens: List[Token] =
    while (!isAtEnd) {
      // We are at the beginning of the next lexeme.
      start = current;
      scanToken
    }

    tokens :+ Token(TokenType.EOF, "", null, line)

  def isAtEnd = current == program.size

  def scanToken =
    advance match {
      case '+' =>
        addSearchKey
      case ':' =>
        addSearchValue
      case '(' =>
        addToken(TokenType.LEFT_BRACKET)
      case ')' =>
        addToken(TokenType.RIGHT_BRACKET)
      case ' '  => ()
      case '\r' => ()
      case '\t' => ()
      case '\n' =>
        line = line + 1
      case c if c.isDigit         => addNumber
      case '"'                    => addString
      case _ if isReservedWord    => addIdentifier
      case _ => addUnquotedString
    }

  def addSearchKey =
    while ((peek != ':') && !isAtEnd)
      advance
    val key = program.substring(start + 1, current)
    addToken(TokenType.SEARCH_KEY, key)

  def addSearchValue =
    while ((peek != ' ') && !isAtEnd)
      advance

    val value = program.substring(start + 1, current)
    addToken(TokenType.SEARCH_VALUE, value)

  def isReservedWord =
    Token.reservedWords.exists {
      case (str, _) => program.substring(start).startsWith(str)
    }

  def addIdentifier =
    while (peek.isLetterOrDigit) advance
    val text = program.substring(start, current)
    Token.reservedWords.get(text) match {
      case Some(token) => addToken(token)
      case None => error(line, "Expected identifier")
    }

  def addNumber =
    while (peek.isDigit)
      advance
    if (peek == '.' && peekNext.isDigit)
      advance
      while (peek.isDigit) advance

    addToken(TokenType.NUMBER, program.substring(start, current).toDouble)

  def addUnquotedString =
    while (peek != ' ' && peek != ')' && !isAtEnd)
      advance

    addToken(TokenType.STRING, program.substring(start, current))

  def addString =
    while ((peek != '"') && !isAtEnd)
      advance

    if (isAtEnd) error(line, "Unterminated string at end of file")
    else
      advance
      addToken(TokenType.STRING, program.substring(start + 1, current - 1))

  def addToken(tokenType: TokenType, literal: Double | String | Null = null) =
    val text = program.substring(start, current)
    tokens = tokens :+ Token(tokenType, text, literal, line)

  def addCommentBlock: Unit =
    while (!(peek == '*' && peekNext == '/') && !isAtEnd)
      // If we encounter another comment, consume that too
      if (peek == '/' && peekNext == '*')
        advance
        advance
        addCommentBlock
      if (peek == '\n')
        line = line + 1
      advance
    // Skip past the two remaining chars
    advance
    advance

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

// expression =
//   literal
//   unary
//   binary
//   grouping

// literal =
//   STRING
//   NUMBER
//   "true"
//   "false"
//   "nil"

// unary =
//   (BANG | MINUS)+ expression

// binary =
//   expression OPERATOR expression

// grouping =
//   LEFT_PAREN expression RIGHT_PAREN

// operator =  BANG_EQUAL,
//   EQUAL, EQUAL_EQUAL,
//   GREATER, GREATER_EQUAL,
//   LESS, LESS_EQUAL, MINUS, PLUS,
//   SLASH, STAR
