package cql

import TokenType.*
import cql.grammar.*

import java.net.{URI, URLEncoder}
import java.nio.charset.Charset
import scala.collection.mutable.Map
import scala.collection.mutable.ListBuffer

case class InterpreterResult(queryStr: String, typeaheadNodes: List[QueryMeta])

case class InterpreterError(message: String) extends Error(message)

object Interpreter {
  def evaluate(
      program: QueryList
  ): InterpreterResult =
    val (searchStrs, otherQueries) = program.exprs.partitionMap {
      case q: QueryBinary                    => Left(strFromBinary(q))
      case QueryMeta(key, Some(value)) => Right(s"$key=$value")
      case QueryMeta(key, None) =>
        throw new InterpreterError(
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
    val typeaheadNodes = program.exprs.collect { case n: QueryMeta => n }

    InterpreterResult(queryStr, typeaheadNodes)

  def strFromContent(queryContent: QueryContent): String =
    queryContent.content match {
      case QueryStr(str)       => str
      case QueryGroup(content) => s"(${strFromBinary(content)})"
      case q: QueryBinary      => strFromBinary(q)
    }

  def strFromBinary(queryBinary: QueryBinary): String =
    val leftStr = strFromContent(queryBinary.left)
    val rightStr = queryBinary.right
      .map { case (op, content) =>
        s" ${op.tokenType.toString} ${strFromContent(content)}"
      }
      .getOrElse("")
    leftStr + rightStr
}
