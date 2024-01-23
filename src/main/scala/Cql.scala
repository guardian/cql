package cql

import scala.io.Source
import scala.util.{Failure, Success, Try}
import cql.grammar.{CqlResult, QueryList}
import io.circe.generic.semiauto.*
import io.circe.Encoder


class Cql:
  def run(program: String) =
    val scanner = new Scanner(program)
    val tokens = scanner.scanTokens
    val parser = new Parser(tokens)
    parser.parse() match
      case Success(expr) =>
        Try { Interpreter.evaluate(expr) } match {
          case Success(capiQuery) => CqlResult(tokens, Some(expr), Some(capiQuery))
          case Failure(e) => CqlResult(tokens, Some(expr), None, Some(e.getMessage))
        }
      case Failure(e) =>
        CqlResult(tokens, None, None, Some(e.getMessage))
