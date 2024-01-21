package cql

import cql.grammar._
import cql.Token
import cql.TokenType

object AstPrinter {
  def programToString(query: QueryList) =
    query.exprs.map(exprToString).mkString(";\n")

  def exprToString(expr: QueryBinary | QueryMeta): String = expr match
    case _ => s"Not implemented for $expr"
}
