package cql

import TokenType._
import cql.grammar._

import scala.collection.mutable.Map
import scala.collection.mutable.ListBuffer

object Interpreter {

  def evaluate(
                program: QueryList,
              ): String =
    val (searchStrs, otherQueries) = program.exprs.partitionMap {
      case q: QueryBinary => Left(strFromBinary(q))
      case QueryMeta(key, value) => Right(s"$key=$value")
    }

    val maybeSearchStr = searchStrs match {
      case Nil => None
      case strs => Some(s"q=${strs.mkString(" ")}")
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
    val leftStr = queryBinary.left.searchExpr
    val rightStr = queryBinary.right.map {
      case (op, content) => s" ${op.tokenType.toString} ${strFromContent(content)}"
    }.getOrElse("")
    leftStr + rightStr
}
