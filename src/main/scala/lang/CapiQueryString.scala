package cql.lang

import TokenType.*
import cql.lang.*

import java.net.{URI, URLEncoder}
import java.nio.charset.Charset
import scala.collection.mutable.Map
import scala.collection.mutable.ListBuffer

case class CapiQueryStringError(message: String) extends Error(message)

object CapiQueryString {
  def build(
      program: QueryList
  ): String =
    val (searchStrs, otherQueries) = program.exprs.partitionMap {
      case q: QueryBinary => Left(strFromBinary(q))
      case QueryField(key, Some(value)) =>
        Right(s"${key.literal.getOrElse("")}=${value.literal.getOrElse("")}")
      case QueryField(key, None) =>
        throw new CapiQueryStringError(
          s"The field '+$key' needs a value after it (e.g. +$key:tone/news)"
        )
      case QueryOutputModifier(key, Some(value)) =>
        Right(s"${key.literal.getOrElse("")}=${value.literal.getOrElse("")}")
      case QueryOutputModifier(key, None) =>
        throw new CapiQueryStringError(
          s"The output modifier '@$key' needs a value after it (e.g. +$key:all)"
        )
    }

    val maybeSearchStr = searchStrs match {
      case Nil => None
      case strs =>
        val encodedString =
          new URI(null, null, strs.mkString(" "), null).toASCIIString
        Some(s"q=$encodedString")
    }

    List(maybeSearchStr, otherQueries).flatten.mkString("&")

  private def strFromContent(queryContent: QueryContent): String =
    queryContent.content match {
      case QueryStr(str)       => str
      case QueryGroup(content) => s"(${strFromBinary(content)})"
      case q: QueryBinary      => strFromBinary(q)
    }

  private def strFromBinary(queryBinary: QueryBinary): String =
    val leftStr = strFromContent(queryBinary.left)
    val rightStr = queryBinary.right
      .map { case (op, content) =>
        s" ${op.tokenType.toString} ${strFromBinary(content)}"
      }
      .getOrElse("")
    leftStr + rightStr
}
