package cql

import org.scalatest._

import flatspec._
import matchers._
import funspec.AnyFunSpec
import org.scalatest.funspec.AsyncFunSpec
import cql.grammar.QueryMeta

abstract class BaseTest extends AsyncFunSpec with should.Matchers {
  def leftParenToken(start: Int = 0) = Token(TokenType.LEFT_BRACKET, "(", Some("("), start, start + 1)
  def rightParenToken(start: Int = 0) = Token(TokenType.RIGHT_BRACKET, ")", Some(")"), start, start + 1)
  def andToken(start: Int = 0) = Token(TokenType.AND, "AND", Some("AND"), start, start + 3)
  def eofToken(start: Int) = Token(TokenType.EOF, "", None, start, start)
  def unquotedStringToken(str: String, start: Int = 0) =
    Token(TokenType.STRING, str, Some(str), start, start + str.length - 1)
  def quotedStringToken(str: String, start: Int = 0) = Token(
    TokenType.STRING,
    s"\"$str\"",
    Some(str),
    start,
    start + str.length + 1
  )

  def queryMetaKeyToken(str: String, start: Int = 0) =
    Token(
      TokenType.QUERY_META_KEY,
      s"+$str",
      Some(str),
      start,
      start + str.length
    )
  def queryMetaValueToken(str: String, start: Int = 0) =
    Token(
      TokenType.QUERY_META_VALUE,
      s":$str",
      Some(str),
      start,
      start + str.length
    )

  def queryMeta(key: String, value: Option[String], start: Int = 0): QueryMeta =
    QueryMeta(
      queryMetaKeyToken(key, start),
      value.map { str => queryMetaValueToken(str, start + key.length + 2) }
    )
}
