package cql

import TokenType.*
import cql.grammar.*

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
      case q: QueryBinary                    => Left(strFromBinary(q))
      case QueryField(key, Some(value)) => Right(s"${key.literal.getOrElse("")}=${value.literal.getOrElse("")}")
      case QueryField(key, None) =>
        throw new CapiQueryStringError(
          s"The key '+$key' needs a value after it (e.g. +$key:tone/news)"
        )
    }

    val maybeSearchStr = searchStrs match {
      case Nil => None
      case strs =>
        val encodedString =
          new URI(null, null, strs.mkString(" "), null).toASCIIString
        Some(s"q=$encodedString")
    }

    val maybeOtherQueries = otherQueries match {
      case Nil  => None
      case strs => Some(strs.mkString(""))
    }

    val queryStr = List(maybeSearchStr, maybeOtherQueries).flatten.mkString("&")

    queryStr

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
        s" ${op.tokenType.toString} ${strFromContent(content)}"
      }
      .getOrElse("")
    leftStr + rightStr
}
