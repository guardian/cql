package cql

import scala.io.Source
import scala.util.Success
import scala.util.Failure
import cql.grammar.QueryList

class Cql:
  def run(program: String) =
    val scanner = new Scanner(program)
    val tokens = scanner.scanTokens
    val parser = new Parser(tokens)
    parser.parse() match
      case Success(expr) =>
        val results = Interpreter.evaluate(expr)
        results
      case Failure(e) =>
        QueryList(List.empty)
