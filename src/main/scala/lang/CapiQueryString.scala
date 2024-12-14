package cql.lang

import TokenType.*
import cql.lang.*

import java.net.{URI, URLEncoder}
import java.nio.charset.Charset
import scala.collection.mutable.Map
import scala.collection.mutable.ListBuffer

case class CapiCqlStringError(message: String) extends Error(message)

object CapiCqlString {
  def build(
      program: QueryList
  ): String =
    val (searchStrs, otherQueries) = program.exprs.partitionMap {
      case q: CqlBinary => Left(strFromBinary(q))
      case CqlField(key, Some(value)) =>
        Right(s"${key.literal.getOrElse("")}=${value.literal.getOrElse("")}")
      case CqlField(key, None) =>
        throw new CapiCqlStringError(
          s"The field '+$key' needs a value after it (e.g. +$key:tone/news)"
        )
      case QueryOutputModifier(key, Some(value)) =>
        Right(s"${key.literal.getOrElse("")}=${value.literal.getOrElse("")}")
      case QueryOutputModifier(key, None) =>
        throw new CapiCqlStringError(
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

  private def strFromContent(queryContent: QueryExpr): String =
    queryContent.content match {
      case CqlStr(str)       => str
      case CqlGroup(content) => s"(${strFromBinary(content)})"
      case q: CqlBinary      => strFromBinary(q)
    }

  private def strFromBinary(queryBinary: CqlBinary): String =
    val leftStr = strFromContent(queryBinary.left)
    val rightStr = queryBinary.right
      .map { case (op, content) =>
        s" ${op.tokenType.toString} ${strFromBinary(content)}"
      }
      .getOrElse("")
    leftStr + rightStr
}
