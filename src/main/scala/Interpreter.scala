package cql

import TokenType._
import cql.grammar._

import scala.collection.mutable.Map
import scala.collection.mutable.ListBuffer
//
//type cqlValue = String | Double | Boolean
//
//class Environment(parent: Option[Environment] = None):
//  private val values: Map[String, cqlValue] = Map.empty
//
//  def get(name: String): Option[cqlValue] =
//    values.get(name).orElse(parent.flatMap(_.get(name)))
//  def set(name: String, value: cqlValue): Unit = parent match
//    // Set in the parent, if a value exists.
//    case Some(p) if p.get(name).isDefined => p.set(name, value)
//    // Else, set locally.
//    case _ => values += (name -> value)
//
//  def mkString: String =
//    s"${values} ${parent.map(p => s"${p.mkString}").getOrElse("END")}"
//
//class InterpreterError(message: String) extends Exception(message)
object Interpreter {

  def evaluate(
                program: QueryList,
              ): String =
    val (searchStrs, otherQueries) = program.exprs.partitionMap {
      case SearchExprQuoted(str) => Left(str)
      case SearchExprBasic(str) => Left(str)
      case SearchParam(searchParam) => searchParam match {
        case SearchParamBasic(key, value) => Right(s"&$key=$value")
        case SearchParamDate(key, value) => Right(s"&$key=$value")
      }
    }

    s"q=${searchStrs.concat(" ")}&${otherQueries.concat("")}"
}

//
//  def evaluateExpr(expr: Expr, env: Environment): cqlValue = expr match
//    case ExprList(left, right) =>
//      val leftVal = evaluateExpr(left, env)
//      right.map(r => evaluateExpr(r, env)).getOrElse(leftVal)
//    case Binary(left, operator, right) =>
//      val leftVal = evaluateExpr(left, env)
//      val rightVal = evaluateExpr(right, env)
//      (operator.tokenType, leftVal, rightVal) match
//        case (EQUAL_EQUAL, l, r) => l == r
//        case (GREATER_EQUAL, l: Double, r: Double) =>
//          assertNumericOperation(l, r, operator.tokenType)
//          l >= r
//        case (LESS_EQUAL, l: Double, r: Double) =>
//          assertNumericOperation(l, r, operator.tokenType)
//          l <= r
//        case (LESS, l: Double, r: Double) =>
//          assertNumericOperation(l, r, operator.tokenType)
//          l < r
//        case (GREATER, l: Double, r: Double) =>
//          assertNumericOperation(l, r, operator.tokenType)
//          l > r
//        case (STAR, l: Double, r: Double) =>
//          assertNumericOperation(l, r, operator.tokenType)
//          l * r
//        case (SLASH, l: Double, r: Double) =>
//          assertNumericOperation(l, r, operator.tokenType)
//          l / r
//        case (MINUS, l: Double, r: Double) =>
//          assertNumericOperation(l, r, operator.tokenType)
//          l - r
//        case (PLUS, l: Double, r: Double) =>
//          l + r
//        case (PLUS, l, r) =>
//          l.toString + r.toString
//        case _ =>
//          throw new InterpreterError(
//            s"Cannot use operator ${operator.tokenType} with ${leftVal} and ${rightVal}"
//          )
//    case Grouping(expr) => evaluateExpr(expr, env)
//    case Literal(value) => value
//    case Unary(operator, right) =>
//      val rightVal = evaluateExpr(right, env)
//      (operator.tokenType, rightVal) match
//        case (BANG, _)          => !isTruthy(rightVal)
//        case (MINUS, r: Double) => -r
//    case Variable(name) =>
//      env.get(name.lexeme) match
//        case Some(value) => value
//        case None =>
//          throw new InterpreterError(s"Variable ${name.lexeme} not found")
//    case Assign(name, expr) =>
//      if (env.get(name.lexeme).isDefined)
//        env.set(name.lexeme, evaluateExpr(expr, env))
//        null
//      else
//        println(env.mkString)
//        throw new InterpreterError(
//          s"Cannot assign to variable ${name}: it has not been defined"
//        )
//    case Logical(left, operator, right) =>
//      val leftVal = evaluateExpr(left, env)
//      operator.tokenType match
//        case OR =>
//          if (isTruthy(leftVal)) leftVal
//          else evaluateExpr(right, env)
//        case AND =>
//          if (isTruthy(leftVal)) evaluateExpr(right, env)
//          else leftVal
//        case _ =>
//          throw new InterpreterError(
//            s"Tried to evaluate an operator, but operator ${operator.tokenType} not supported"
//          )
//
//  def isTruthy(value: cqlValue): Boolean = value match
//    case _: Double  => false
//    case _: String  => false
//    case b: Boolean => b
//
//  def assertNumericOperation(l: cqlValue, r: cqlValue, t: TokenType) =
//    if (!isNumber(l) || !isNumber(r))
//      throw new InterpreterError(
//        s"Operator ${t} must receive two numbers – instead, it got ${l} and ${r}"
//      )
//
//  def isString(value: cqlValue) = value match
//    case _: String => true
//    case _         => false
//
//  def isNumber(value: cqlValue) = value match
//    case _: Double => true
//    case _         => false
//
//  def isBool(value: cqlValue) = value match
//    case _: Boolean => true
//    case _          => false
//}
