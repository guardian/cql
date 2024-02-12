package cql

import TokenType.*
import cql.grammar.*

import scala.util.Try
import scala.util.Success

class ParseError(message: String) extends Error(message)

object Parser:
  def error(token: Token, message: String) =
    if (token.tokenType == EOF)
      report(token.start, " at end of file", message)
    else
      report(token.start, s" at '${token.lexeme}'", message)

  def report(line: Int, location: String, message: String) =
    val msg = s"${message} ${location} on line $line"
    new ParseError(msg)

class Parser(tokens: List[Token]):
  var current: Int = 0;
  val skipTypes = List()

  def parse(): Try[QueryList] =
    Try { queryList }

  // program    -> statement* EOF
  private def queryList =
    var queries = List.empty[QueryBinary | QueryMeta]
    while (peek().tokenType != EOF) {
      queries = queries :+ query
    }
    QueryList(queries)

  val startOfQueryMeta = List(TokenType.QUERY_META_KEY, TokenType.PLUS)

  private def query: QueryBinary | QueryMeta =
    if (startOfQueryMeta.contains(peek().tokenType)) queryMeta
    else queryBinary

  private def queryBinary =
    val left = queryContent
    peek().tokenType match {
      case TokenType.AND =>
        QueryBinary(left, Some((consume(TokenType.AND), queryContent)))
      case TokenType.OR =>
        QueryBinary(left, Some((consume(TokenType.OR), queryContent)))
      case _ => QueryBinary(left)
    }

  private def queryContent: QueryContent =
    val content: QueryGroup | QueryStr | QueryBinary =
      if (peek().tokenType == TokenType.LEFT_BRACKET) queryGroup
      else if (peek().tokenType == TokenType.STRING) queryStr
      else queryBinary

    QueryContent(content)

  private def queryGroup: QueryGroup =
    consume(TokenType.LEFT_BRACKET, "Groups should start with a left bracket")
    val content = queryBinary
    consume(TokenType.RIGHT_BRACKET, "Groups must end with a right bracket")
    QueryGroup(content)

  private def queryStr: QueryStr =
    val token = consume(TokenType.STRING, "Expected a string")
    QueryStr(token.literal.getOrElse(""))

  private def queryMeta =
    val key = Try {
      consume(TokenType.QUERY_META_KEY, "Expected a search key")
    }.recover { _ =>
      consume(TokenType.PLUS, "Expected at least a +")
    }.get

    val value = Try {
      Some(consume(TokenType.QUERY_META_VALUE, "Expected a search key").literal.getOrElse(""))
    }.recoverWith { _ =>
      Try {
        consume(TokenType.COLON, "Expected at least a :")
        Some("")
      }.recover { _ =>
        None
      }
    }.get

    QueryMeta(key.literal.getOrElse(""), value)

  private def matchTokens(tokens: TokenType*) =
    tokens.exists(token =>
      if (check(token)) {
        advance()
        true
      } else false
    )

  private def check(tokenType: TokenType) =
    if (isAtEnd) false else peek().tokenType == tokenType

  private def isAtEnd = peek().tokenType == EOF

  private def peek() = tokens(current)

  private def advance() =
    if (!isAtEnd) current = current + 1
    previous()

  private def consume(tokenType: TokenType, message: String = "") = {
    if (check(tokenType)) advance()
    else throw Parser.error(peek(), message)
  }

  private def previous() = tokens(current - 1)

  private def synchronize(): Unit =
    advance()
    while (!isAtEnd) {
      if (previous().tokenType == COLON)
        return
      if (skipTypes.contains(peek().tokenType))
        return
      advance()
    }
