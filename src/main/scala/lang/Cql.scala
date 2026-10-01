package cql.lang

import scala.concurrent.{ExecutionContext, Future}
import io.circe.Encoder

case class CqlError(message: String, position: Option[Int] = None)
    derives Encoder.AsObject

case class CqlResult(
    tokens: List[Token],
    ast: Option[CqlQuery],
    queryResult: Option[String],
    // Map from tokenType to a map of literals and their suggestions.
    // Avoiding TokenType as type to avoid serialisation shenanigans in prototype.
    suggestions: List[TypeaheadSuggestion],
    error: Option[CqlError]
) derives Encoder.AsObject

class Cql(typeahead: Typeahead):
  private given ExecutionContext = ExecutionContext.global

  def run(program: String): Future[CqlResult] =
    val scanner = new Scanner(program)
    val tokens = scanner.scanTokens

    Parser.parse(tokens) match
      case Right(expr) =>
        typeahead.getSuggestions(expr).map { suggestions =>
          val capiCqlStr = CapiCqlString.build(expr)
          CqlResult(
            tokens,
            Some(expr),
            capiCqlStr.toOption,
            suggestions,
            capiCqlStr.left.toOption.map(e => CqlError(e.message))
          )
        }
      case Left(ParseError(position, message)) =>
        Future.successful(
          CqlResult(
            tokens,
            None,
            None,
            List.empty,
            Some(CqlError(message, Some(position)))
          )
        )
