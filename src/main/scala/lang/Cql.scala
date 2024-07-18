package cql.lang

import scala.util.{Failure, Success, Try}
import io.circe.generic.semiauto.*

import scala.concurrent.Future

case class CqlError(message: String, position: Option[Int] = None)

case class CqlResult(
    tokens: List[Token],
    ast: Option[QueryList],
    queryResult: Option[String],
    // Map from tokenType to a map of literals and their suggestions.
    // Avoiding TokenType as type to avoid serialisation shenanigans in prototype.
    suggestions: List[TypeaheadSuggestion],
    error: Option[CqlError] = None
)

class Cql(typeahead: Typeahead):
  implicit val ec: scala.concurrent.ExecutionContext =
    scala.concurrent.ExecutionContext.global

  def run(program: String): Future[CqlResult] =
    val scanner = new Scanner(program)
    val tokens = scanner.scanTokens
    val parser = new Parser(tokens)

    parser.parse() match
      case Success(expr) =>
        typeahead.getSuggestions(expr).map { suggestions =>
          Try { CapiQueryString.build(expr) } match
            case Success(capiQueryStr) =>
              CqlResult(tokens, Some(expr), Some(capiQueryStr), suggestions)
            case Failure(e: Throwable) =>
              CqlResult(
                tokens,
                Some(expr),
                None,
                suggestions,
                Some(CqlError(e.getMessage, None))
              )
        }
      case Failure(e) =>
        val error = e match {
          case ParseError(position, message) => CqlError(message, Some(position))
          case e: Throwable => CqlError(e.getMessage)
        }

        Future.successful(
          CqlResult(
            tokens,
            None,
            None,
            List.empty,
            Some(error)
          )
        )
