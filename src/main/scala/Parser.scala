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
    var queries = List.empty[QueryBinary | QueryField | QueryOutputModifier]
    while (peek().tokenType != EOF) {
      queries = queries :+ query
    }
    QueryList(queries)

  val startOfQueryField = List(TokenType.QUERY_FIELD_KEY, TokenType.PLUS)
  val startOfQueryOutputModifier =
    List(TokenType.QUERY_OUTPUT_MODIFIER_KEY, TokenType.AT)

  private def query: QueryBinary | QueryField | QueryOutputModifier =
    if (startOfQueryField.contains(peek().tokenType)) queryField
    else if (startOfQueryOutputModifier.contains(peek().tokenType))
      queryOutputModifier
    else queryBinary

  private def queryBinary =
    val left = queryContent

    peek().tokenType match {
      case TokenType.AND =>
        val andToken = consume(TokenType.AND)
        guardAgainstQueryField("after 'AND'.")
        if (isAtEnd) {
          throw new ParseError("There must be a query following 'AND', e.g. this AND that.")
        }
        QueryBinary(left, Some((andToken), queryContent))
      case TokenType.OR =>
        val orToken = consume(TokenType.OR)
        guardAgainstQueryField("after 'OR'.")
        if (isAtEnd) {
          throw new ParseError("There must be a query following 'OR', e.g. this OR that.")
        }
        QueryBinary(left, Some((orToken, queryContent)))
      case _ => QueryBinary(left)
    }

  private def queryContent: QueryContent =
    val content: QueryGroup | QueryStr | QueryBinary = peek().tokenType match
      case TokenType.LEFT_BRACKET => queryGroup
      case TokenType.STRING       => queryStr
      case token if List(TokenType.AND, TokenType.OR).contains(token) =>
        throw Parser.error(
          peek(),
          s"An ${token.toString()} keyword must have a search term before and after it, e.g. this ${token.toString} that."
        )
      case _ => queryBinary

    QueryContent(content)

  private def queryGroup: QueryGroup =
    consume(TokenType.LEFT_BRACKET, "Groups should start with a left bracket")

    if (isAtEnd) {
      throw Parser.error(peek(), "Groups must contain some content. Put a search term between the brackets!")
    }

    guardAgainstQueryField(
      "within a group. Try putting this query outside of the brackets!"
    )

    val content = queryBinary
    consume(TokenType.RIGHT_BRACKET, "Groups must end with a right bracket.")

    QueryGroup(content)

  private def queryStr: QueryStr =
    val token = consume(TokenType.STRING, "Expected a string")
    QueryStr(token.literal.getOrElse(""))

  private def queryField: QueryField =
    val key = Try {
      consume(TokenType.QUERY_FIELD_KEY, "Expected a search key, e.g. +tag")
    }.recover { _ =>
      consume(TokenType.PLUS, "Expected at least a +")
    }.get

    val value = Try {
      consume(TokenType.QUERY_VALUE, s"Expected a search value, e.g. +tag:news")
    }.recoverWith { _ =>
      Try {
        consume(TokenType.COLON, "Expected at least a :")
      }
    }.toOption

    QueryField(key, value)

  private def queryOutputModifier: QueryOutputModifier =
    val key = Try {
      consume(
        TokenType.QUERY_OUTPUT_MODIFIER_KEY,
        "Expected a query modifier key, e.g. @show-fields"
      )
    }.recover { _ =>
      consume(TokenType.AT, "Expected at least an @")
    }.get

    val value = Try {
      consume(
        TokenType.QUERY_VALUE,
        "Expected a value for the query modifier, e.g. @show-fields:all"
      )
    }.recoverWith { _ =>
      Try {
        consume(TokenType.COLON, "Expected at least a :")
      }
    }.toOption

    QueryOutputModifier(key, value)

  private def matchTokens(tokens: TokenType*) =
    tokens.exists(token =>
      if (check(token)) {
        advance()
        true
      } else false
    )

  /** Throw a sensible parse error when a query field or output modifier is
    * found in the wrong place.
    */
  private def guardAgainstQueryField(errorLocation: String) =
    peek().tokenType match {
      case TokenType.AT =>
        throw Parser.error(
          peek(),
          s"You cannot put output modifiers (e.g. @show-fields:all) ${errorLocation}"
        )
      case TokenType.PLUS =>
        throw Parser.error(
          peek(),
          s"You cannot put queries for tags, sections etc. ${errorLocation}"
        )
      case TokenType.QUERY_FIELD_KEY =>
        val queryFieldNode = queryField
        throw Parser.error(
          peek(),
          s"You cannot query for ${queryFieldNode.key.literal.getOrElse("")}s ${errorLocation}"
        )
      case TokenType.QUERY_OUTPUT_MODIFIER_KEY =>
        val queryFieldNode = queryOutputModifier
        throw Parser.error(
          peek(),
          s"You cannot add an output modifier for ${queryFieldNode.key.literal
              .getOrElse("")}s ${errorLocation}"
        )
      case _ => ()
    }

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
