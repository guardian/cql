package cql.lang

import scala.util.{Failure, Success, Try}
import io.circe.generic.semiauto.*

import scala.concurrent.Future
import com.gu.contentapi.client.GuardianContentClient

case class CqlResult(
    tokens: List[Token],
    ast: Option[QueryList],
    queryResult: Option[String],
    // Map from tokenType to a map of literals and their suggestions.
    // Avoiding TokenType as type to avoid serialisation shenanigans in prototype.
    suggestions: List[TypeaheadSuggestion],
    error: Option[String] = None
)

class Cql(typeahead: Typeahead):
  implicit val ec: scala.concurrent.ExecutionContext =
    scala.concurrent.ExecutionContext.global
  val guardianContentClient = new GuardianContentClient("test")

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
            case Failure(e) =>
              CqlResult(
                tokens,
                Some(expr),
                None,
                suggestions,
                Some(e.getMessage)
              )
        }
      case Failure(e) =>
        Future.successful(
          CqlResult(tokens, None, None, List.empty, Some(e.getMessage))
        )
