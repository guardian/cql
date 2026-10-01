package cql.lang

import scala.annotation.tailrec

import CqlUtils.{hasReservedChar, hasWhitespace, unescapeQuotes}
import scala.annotation.tailrec

case class ScannerSettings(
    groups: Boolean = true,
    operators: Boolean = true,
    shortcuts: Map[String, String] = Map.empty
)

class Scanner(program: String, settings: ScannerSettings = ScannerSettings()):
  settings.shortcuts.keys.foreach { shortcut =>
    require(
      !hasReservedChar(shortcut),
      s"The character '$shortcut' is reserved, and cannot be used as a shortcut"
    )
    require(
      shortcut.length <= 1,
      s"The shortcut '$shortcut' is too long: shortcuts can only be a single character"
    )
  }

  /** The index after the scanned lexeme, and the tokens it produced. */
  private type Scanned = (Int, List[Token])

  def scanTokens: List[Token] =
    @tailrec
    def loop(pos: Int, acc: Vector[Token]): List[Token] =
      if pos >= program.length then
        (acc :+ Token(TokenType.EOF, "", None, pos, pos)).toList
      else
        val (next, tokens) = scanToken(pos)
        loop(next, acc :++ tokens)

    loop(0, Vector.empty)

  private def scanToken(start: Int): Scanned =
    val next = start + 1
    def single(tokenType: TokenType, literal: Option[String] = None) =
      (next, List(token(tokenType, start, next, literal)))

    program(start) match
      case '+'                    => single(TokenType.PLUS, Some("+"))
      case '-'                    => single(TokenType.MINUS, Some("-"))
      case ':'                    => single(TokenType.CHIP_KEY, Some(""))
      case '(' if settings.groups => single(TokenType.LEFT_BRACKET)
      case ')' if settings.groups => single(TokenType.RIGHT_BRACKET)
      case ' '                    => (next, Nil)
      case '\r' | '\t' | '"'      => quotedString(start)
      case char =>
        settings.shortcuts
          .get(char.toString)
          .fold(unquotedString(start))(shortcut(start, _))

  /** Unquoted chars could be a reserved word, a field key (if followed by ':'),
    * or an unquoted string.
    */
  private def unquotedString(start: Int): Scanned =
    val wordEnd = advanceWhile(start + 1) { i =>
      !(hasReservedChar(program(i)) && !isEscaped(i)) && !isWhitespaceAt(i)
    }
    val literal = program.substring(start, wordEnd)

    Token.reservedWords.get(literal).filter(_ => settings.operators) match
      case Some(tokenType) => (wordEnd, List(token(tokenType, start, wordEnd)))
      case None if charAt(wordEnd).contains(':') =>
        chip(literal, start, wordEnd)
      case None =>
        // Consume whitespace up until the last whitespace char
        val end = advanceWhile(wordEnd) { i =>
          (!isWhitespaceAt(i) || isWhitespaceAt(i + 1) || i + 1 == program.length) &&
          program(i) != ')'
        }
        val str = program.substring(start, end)
        (end, List(token(TokenType.STRING, start, end, Some(str))))

  private def chip(literal: String, start: Int, colon: Int): Scanned =
    val afterColon = colon + 1
    val key = token(TokenType.CHIP_KEY, start, afterColon, Some(literal))
    val (end, value) = chipValue(afterColon)
    (end, key :: value)

  private def chipValue(start: Int): Scanned =
    if charAt(start).contains('"') then
      val (end, literal) = quotedRange(start)
      val value = Some(literal).filter(_.nonEmpty)
      (end, List(token(TokenType.CHIP_VALUE, start, end, value)))
    else
      val end = advanceWhile(start)(i => !isWhitespaceAt(i))
      val value = Some(unescapeQuotes(program.substring(start, end)))
        .filter(_.nonEmpty)
      val tokens =
        if end == start then Nil
        else List(token(TokenType.CHIP_VALUE, start, end, value))
      (end, tokens)

  private def shortcut(start: Int, shortcut: String): Scanned =
    val afterKey = start + 1
    val key = token(TokenType.CHIP_KEY, start, afterKey, Some(shortcut))
    if afterKey < program.length && !isWhitespaceAt(afterKey) then
      val (end, value) = chipValue(afterKey)
      (end, key :: value)
    else (afterKey, List(key))

  private def quotedString(start: Int): Scanned =
    val (end, literal) = quotedRange(start)
    if charAt(end).contains(':') then chip(literal, start, end)
    else (end, List(token(TokenType.STRING, start, end, Some(literal))))

  /** Consumes a range opened at `start`, returning the index after the closing
    * quote and the literal value it encloses.
    */
  private def quotedRange(start: Int): (Int, String) =
    val closing = advanceWhile(start + 1)(i => program(i) != '"' || isEscaped(i))
    val end =
      if closing == program.length then
        report(
          "I expected to encounter a closing double-quote (\") before the query ended"
        )
        closing
      else closing + 1

    (end, program.substring(start + 1, math.max(start + 1, end - 1)))

  private def token(
      tokenType: TokenType,
      start: Int,
      end: Int,
      literal: Option[String] = None
  ): Token =
    Token(
      tokenType,
      program.substring(start, end),
      literal,
      start,
      math.max(start, end - 1)
    )

  /** The first index from `from` at which `p` fails, or the end of the program. */
  private def advanceWhile(from: Int)(p: Int => Boolean): Int =
    (from until program.length).find(i => !p(i)).getOrElse(program.length)

  private def charAt(index: Int): Option[Char] = program.lift(index)

  private def isEscaped(index: Int): Boolean = charAt(index - 1).contains('\\')

  private def isWhitespaceAt(index: Int): Boolean =
    charAt(index).exists(hasWhitespace)

  private def report(message: String): Unit =
    println(s"[line 1] Error: $message")

