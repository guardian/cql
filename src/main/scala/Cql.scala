package cql

import scala.io.Source
import scala.util.{Failure, Success, Try}
import cql.grammar.{CqlResult, QueryList}
import io.circe.generic.semiauto.*
import io.circe.Encoder
import scala.concurrent.Future

class Cql:
  implicit val ec: scala.concurrent.ExecutionContext = scala.concurrent.ExecutionContext.global
  val typeaheadClient = new TypeaheadQueryCapiClient()
  val typeahead = new Typeahead(typeaheadClient)

  def run(program: String): Future[CqlResult] =
    val scanner = new Scanner(program)
    val tokens = scanner.scanTokens
    val eventuallySuggestions = typeahead.getSuggestions(tokens)
    val parser = new Parser(tokens)
    val result = parser.parse() match
      case Success(expr) =>
        Try { Interpreter.evaluate(expr) } match {
          case Success(capiQuery) =>
            CqlResult(tokens, Some(expr), Some(capiQuery), Map.empty)
          case Failure(e) => CqlResult(tokens, Some(expr), None, Map.empty, Some(e.getMessage))
        }
      case Failure(e) =>
        CqlResult(tokens, None, None, Map.empty, Some(e.getMessage))

    eventuallySuggestions.map { suggestions =>
      result.copy(suggestions = suggestions)
    }
