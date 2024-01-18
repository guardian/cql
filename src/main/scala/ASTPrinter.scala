package cql

import cql.grammar._
import cql.Token
import cql.TokenType

object AstPrinter {
  def programToString(query: QueryList) =
    query.exprs.map(exprToString).mkString(";\n")

  def exprToString(expr: SearchStrQuoted | SearchStr | SearchParam): String = expr match
    case _ => s"Not implemented for $expr"
//    case Variable(name) => s"var ${name.lexeme}".trim
//    case Assign(name, expr) =>
//      s"reassign ${name.lexeme} to ${exprToString(expr)}"
//    case Logical(left, operator, right) =>
//      s"${exprToString(left)} ${operator.tokenType} ${exprToString(right)}"
//    case ExprList(expr, maybeExprList) =>
//      s"${exprToString(expr)} ${maybeExprList.map(expr => s", ${exprToString(expr)}").getOrElse("")}"
//    case Unary(token, literal) => token.lexeme + exprToString(literal)
//    case Binary(left, operator, right) =>
//      s"${operator.lexeme} ${exprToString(left)} ${exprToString(right)}"
//    case Grouping(expr) => exprToString(expr)
//    case Literal(value) => value.toString
}
