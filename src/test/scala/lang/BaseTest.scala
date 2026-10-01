package cql.lang

import org.scalatest._

import flatspec._
import matchers._
import funspec.AnyFunSpec
import org.scalatest.funspec.AsyncFunSpec
import cql.lang.CqlField

abstract class BaseTest extends AsyncFunSpec with should.Matchers {
  def leftParenToken(start: Int = 0) =
    Token(TokenType.LEFT_BRACKET, "(", None, start, start)
  def rightParenToken(start: Int = 0) =
    Token(TokenType.RIGHT_BRACKET, ")", None, start, start)
  def andToken(start: Int = 0) =
    Token(TokenType.AND, "AND", None, start, start + 2)
  def orToken(start: Int = 0) =
    Token(TokenType.OR, "OR", None, start, start + 1)
  def eofToken(start: Int) = Token(TokenType.EOF, "", None, start, start)
  def minusToken(start: Int = 0) =
    Token(TokenType.MINUS, "-", Some("-"), start, start)
  def plusToken(start: Int = 0) =
    Token(TokenType.PLUS, "+", Some("+"), start, start)
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
      str,
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
      value.map { str => queryValueToken(str, start + key.length + 1) }
    )
}

