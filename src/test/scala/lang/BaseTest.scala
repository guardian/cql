package cql.lang

import org.scalatest._

import flatspec._
import matchers._
import funspec.AnyFunSpec
import org.scalatest.funspec.AsyncFunSpec
import cql.lang.{CqlField, QueryOutputModifier}

abstract class BaseTest extends AsyncFunSpec with should.Matchers {
  def leftParenToken(start: Int = 0) =
    Token(TokenType.LEFT_BRACKET, "(", Some("("), start, start + 1)
  def rightParenToken(start: Int = 0) =
    Token(TokenType.RIGHT_BRACKET, ")", Some(")"), start, start + 1)
  def andToken(start: Int = 0) =
    Token(TokenType.AND, "AND", Some("AND"), start, start + 3)
  def eofToken(start: Int) = Token(TokenType.EOF, "", None, start, start)
  def colonToken(start: Int) = Token(TokenType.COLON, "", None, start, start)
  def unquotedStringToken(str: String, start: Int = 0) =
    Token(TokenType.STRING, str, Some(str), start, start + str.length - 1)
  def quotedStringToken(str: String, start: Int = 0) = Token(
    TokenType.STRING,
    s"\"$str\"",
    Some(str),
    start,
    start + str.length + 1
  )
  def queryFieldKeyToken(str: String, start: Int = 0) =
    Token(
      TokenType.CHIP_KEY,
      s"+$str",
      Some(str),
      start,
      start + str.length
    )
  def queryOutputModifierKeyToken(str: String, start: Int = 0) =
    Token(
      TokenType.QUERY_OUTPUT_MODIFIER_KEY,
      s"@$str",
      Some(str),
      start,
      start + str.length
    )
  def queryValueToken(str: String, start: Int = 0) =
    Token(
      TokenType.CHIP_VALUE,
      s":$str",
      Some(str),
      start,
      start + str.length
    )

  def queryField(
      key: String,
      value: Option[String],
      start: Int = 0
  ): CqlField =
    CqlField(
      queryFieldKeyToken(key, start),
      value.map { str => queryValueToken(str, start + key.length + 2) }
    )

  def queryOutputModifier(
      key: String,
      value: Option[String],
      start: Int = 0
  ): QueryOutputModifier =
    QueryOutputModifier(
      queryOutputModifierKeyToken(key, start),
      value.map { str => queryValueToken(str, start + key.length + 2) }
    )
}
