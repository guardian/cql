package cql

import TokenType._
import cql.grammar._

import scala.collection.mutable.Map
import scala.collection.mutable.ListBuffer

class InterpreterError(message: String) extends Error(message)

object Interpreter {
  def evaluate(
                program: QueryList,
              ): String =
    val (searchStrs, otherQueries) = program.exprs.partitionMap {
      case q: QueryBinary => Left(strFromBinary(q))
      case QueryMeta(Some(key), Some(value)) => Right(s"$key=$value")
      case QueryMeta(Some(key), None) => throw new InterpreterError(s"The key '+$key' needs a value after it (e.g. +$key:tone/news)")
      case QueryMeta(None, Some(value)) => throw new InterpreterError(s"The value ':$value' needs a key before it (e.g. +tag:$value)")
      case QueryMeta(None, None) => throw new InterpreterError(s"I encountered an empty query")
    }

    val maybeSearchStr = searchStrs match {
      case Nil => None
      case strs => Some(s"q=${strs.mkString("%20")}")
    }

    val maybeOtherQueries = otherQueries match {
      case Nil => None
      case strs => Some(strs.mkString(""))
    }

    List(maybeSearchStr, maybeOtherQueries).flatten.mkString("&")

  def strFromContent(queryContent: QueryContent): String = queryContent.content match {
    case QueryStr(str) => str
    case QueryGroup(content) => s"(${strFromBinary(content)})"
    case q: QueryBinary => strFromBinary(q)
  }

  def strFromBinary(queryBinary: QueryBinary): String =
    val leftStr = strFromContent(queryBinary.left)
    val rightStr = queryBinary.right.map {
      case (op, content) => s"%20${op.tokenType.toString}%20${strFromContent(content)}"
    }.getOrElse("")
    leftStr + rightStr
}
