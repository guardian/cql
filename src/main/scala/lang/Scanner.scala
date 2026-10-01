package cql.lang

import CqlUtils.{hasReservedChar, hasWhitespace, unescapeQuotes}

case class ScannerSettings(
    groups: Boolean = true,
    operators: Boolean = true,
    shortcuts: Map[String, String] = Map.empty
)

class Scanner(program: String, settings: ScannerSettings = ScannerSettings()):
  private var tokens: List[Token] = List.empty
  private var start = 0
  private var currentIndex = 0
  private var line = 1

  settings.shortcuts.keys.foreach { shortcut =>
    if (hasReservedChar(shortcut))
      throw new IllegalArgumentException(
        s"The character '$shortcut' is reserved, and cannot be used as a shortcut"
      )
    if (shortcut.length > 1)
      throw new IllegalArgumentException(
        s"The shortcut '$shortcut' is too long: shortcuts can only be a single character"
      )
  }

  def scanTokens: List[Token] =
    while (!isAtEnd()) {
      // We are at the beginning of the next lexeme.
      nextToken()
      scanToken()
    }

    tokens :+ Token(TokenType.EOF, "", None, currentIndex, currentIndex)

  private def nextToken() =
    start = currentIndex

  private def scanToken(): Unit =
    advance() match {
      case '+' =>
        addToken(TokenType.PLUS, Some("+"))
      case '-' =>
        addToken(TokenType.MINUS, Some("-"))
      case ':' =>
        addToken(TokenType.CHIP_KEY, Some(""))
      case '(' =>
        if (settings.groups) addToken(TokenType.LEFT_BRACKET)
        else handleUnquotedString()
      case ')' =>
        if (settings.groups) addToken(TokenType.RIGHT_BRACKET)
        else handleUnquotedString()
      case ' ' => ()
      case '\r' | '\t' | '"' =>
        handleQuotedString()
      case _ =>
        val currentChar = current().toString
        settings.shortcuts.get(currentChar) match {
          case Some(shortcut) => addShortcut(shortcut)
          case None           => handleUnquotedString()
        }
    }

  /** Unquoted chars could be a reserved word, a field key (if followed by ':'),
    * or an unquoted string.
    */
  private def handleUnquotedString(): Unit =
    while (
      !(hasReservedChar(peek()) && !peekIsEscaped()) &&
      !hasWhitespace(peek()) &&
      !isAtEnd()
    )
      advance()

    val literal = program.substring(start, currentIndex)
    val maybeReservedWord = Token.reservedWords.get(literal)

    if (maybeReservedWord.isDefined && settings.operators)
      return addToken(maybeReservedWord.get)

    if (peek() == ':')
      return addChip(literal)

    while (
      // Consume whitespace up until the last whitespace char
      (!hasWhitespace(peek()) || hasWhitespace(peek(1)) || isAtEnd(1)) &&
      peek() != ')' &&
      !isAtEnd()
    )
      advance()

    addToken(TokenType.STRING, Some(program.substring(start, currentIndex)))

  /** Add a chip. Use after consuming the chip literal. */
  private def addChip(literal: String): Unit =
    advance()
    addToken(TokenType.CHIP_KEY, Some(literal))
    nextToken()
    maybeAddChipValue()

  private def maybeAddChipValue(): Unit =
    if (peek() == '"') {
      advance()
      val literal = consumeQuotedRange()
      addToken(
        TokenType.CHIP_VALUE,
        if (literal == "") None else Some(literal)
      )
      return
    }

    while (!hasWhitespace(peek()) && !isAtEnd())
      advance()

    if (currentIndex - start == 0) {
      // No content - add nothing
    } else {
      val value = unescapeQuotes(program.substring(start, currentIndex))
      addToken(TokenType.CHIP_VALUE, if (value == "") None else Some(value))
    }

  private def addShortcut(shortcut: String): Unit =
    addToken(TokenType.CHIP_KEY, Some(shortcut))
    if (!isAtEnd() && !hasWhitespace(peek())) {
      nextToken()
      maybeAddChipValue()
    }

  private def handleQuotedString(): Unit =
    val literal = consumeQuotedRange()

    if (peek() == ':')
      return addChip(literal)

    addToken(TokenType.STRING, Some(literal))

  /** Consumes a quoted range, returning the literal value it encloses. */
  private def consumeQuotedRange(): String =
    while ((peek() != '"' || peek(-1) == '\\') && !isAtEnd())
      advance()

    if (isAtEnd())
      error(
        line,
        "I expected to encounter a closing double-quote (\") before the query ended"
      )
    else
      advance()

    program.substring(start + 1, currentIndex - 1)

  private def addToken(
      tokenType: TokenType,
      literal: Option[String] = None
  ): Unit =
    val lexeme = program.substring(start, currentIndex)
    tokens = tokens :+ Token(
      tokenType,
      lexeme,
      literal,
      start,
      math.max(start, currentIndex - 1)
    )

  private def advance(): Char =
    val previous = currentIndex
    currentIndex = currentIndex + 1
    program(previous)

  private def peekIsEscaped(offset: Int = 0): Boolean =
    peek(offset - 1) == '\\'

  private def current(): Char = peek(-1)

  private def peek(offset: Int = 0): Char =
    val index = currentIndex + offset
    if (index < 0 || index >= program.length) '\u0000' else program(index)

  private def isAtEnd(offset: Int = 0): Boolean =
    currentIndex + offset == program.length

  private def error(line: Int, message: String): Unit =
    report(line, "", message)

  private def report(line: Int, where: String, message: String): Unit =
    println(s"[line ${line}] Error${where}: ${message}")

