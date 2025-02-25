package cql.lang

import scala.util.Try
import scala.util.Success

import TokenType.*

case class ParseError(position: Int, message: String) extends Error(message)

class Parser(tokens: List[Token]):
  var current: Int = 0;
  val skipTypes = List()

  def parse(): Try[QueryList] =
    Try { queryList }

  // program    -> statement* EOF
  private def queryList =
    var queries = List.empty[CqlBinary | CqlField | QueryOutputModifier]
    while (peek().tokenType != EOF) {
      queries = queries :+ query
    }
    QueryList(queries)

  val startOfCqlField = List(TokenType.CHIP_KEY, TokenType.PLUS)
  val startOfQueryOutputModifier =
    List(TokenType.QUERY_OUTPUT_MODIFIER_KEY, TokenType.AT)
  val startOfQueryValue =
    List(TokenType.CHIP_VALUE, TokenType.COLON)

  private def query: CqlBinary | CqlField | QueryOutputModifier =
    if (startOfCqlField.contains(peek().tokenType)) queryField
    else if (startOfQueryOutputModifier.contains(peek().tokenType))
      queryOutputModifier
    else if (startOfQueryValue.contains(peek().tokenType))
      throw ParseError(
        peek().start,
        "I found an unexpected ':'. Did you intend to search for a tag, section or similar, e.g. tag:news? If you would like to add a search phrase containing a ':' character, please surround it in double quotes."
      )
    else queryBinary

  private def queryBinary: CqlBinary =
    val left = queryContent

    peek().tokenType match {
      case TokenType.AND =>
        val andToken = consume(TokenType.AND)
        guardAgainstCqlField("after 'AND'.")
        if (isAtEnd) {
          throw error(
            "There must be a query following 'AND', e.g. this AND that."
          )
        }
        CqlBinary(left, Some((andToken), queryBinary))
      case TokenType.OR =>
        val orToken = consume(TokenType.OR)
        guardAgainstCqlField("after 'OR'.")
        if (isAtEnd) {
          error(
            "There must be a query following 'OR', e.g. this OR that."
          )
        }
        CqlBinary(left, Some((orToken, queryBinary)))
      case _ => CqlBinary(left)
    }

  private def queryContent: QueryExpr =
    val content: CqlGroup | CqlStr | CqlBinary = peek().tokenType match
      case TokenType.LEFT_BRACKET => queryGroup
      case TokenType.STRING       => queryStr
      case token if List(TokenType.AND, TokenType.OR).contains(token) =>
        throw error(
          s"An ${token.toString()} keyword must have a search term before and after it, e.g. this ${token.toString} that."
        )
      case _ =>
        throw error(s"I didn't expect what I found after '${previous().lexeme}'")

    QueryExpr(content)

  private def queryGroup: CqlGroup =
    consume(TokenType.LEFT_BRACKET, "Groups should start with a left bracket")

    if (isAtEnd || peek().tokenType == TokenType.RIGHT_BRACKET) {
      throw error(
        "Groups must contain some content. Put a search term between the brackets!"
      )
    }

    guardAgainstCqlField(
      "within a group. Try putting this query outside of the brackets!"
    )

    val binary = queryBinary
    consume(TokenType.RIGHT_BRACKET, "Groups must end with a right bracket.")

    CqlGroup(binary)

  private def queryStr: CqlStr =
    val token = consume(TokenType.STRING, "Expected a string")
    CqlStr(token.literal.getOrElse(""))

  private def queryField: CqlField =
    val key = Try {
      consume(TokenType.CHIP_KEY, "Expected a search key, e.g. +tag")
    }.recover { _ =>
      consume(TokenType.PLUS, "Expected at least a +")
    }.get

    val value = Try {
      consume(TokenType.CHIP_VALUE, s"Expected a search value, e.g. +tag:news")
    }.recoverWith { _ =>
      Try {
        consume(TokenType.COLON, "Expected at least a :")
      }
    }.toOption

    CqlField(key, value)

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
        TokenType.CHIP_VALUE,
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
  private def guardAgainstCqlField(errorLocation: String) =
    peek().tokenType match {
      case TokenType.AT =>
        throw error(
          s"You cannot put output modifiers (e.g. @show-fields:all) ${errorLocation}"
        )
      case TokenType.PLUS =>
        throw error(
          s"You cannot put queries for tags, sections etc. ${errorLocation}"
        )
      case TokenType.CHIP_KEY =>
        val queryFieldNode = queryField
        throw error(
          s"You cannot query for ${queryFieldNode.key.literal.getOrElse("")}s ${errorLocation}"
        )
      case TokenType.QUERY_OUTPUT_MODIFIER_KEY =>
        val queryFieldNode = queryOutputModifier
        throw error(
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
    else throw error(message)
  }

  private def previous() = tokens(current - 1)

  private def error(message: String) =
    new ParseError(peek().start, message)
