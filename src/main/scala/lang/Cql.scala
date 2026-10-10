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
  def run(program: String)(using ExecutionContext): Future[CqlResult] =
    val tokens = Scanner.scanTokens(program)

    Parser.parse(tokens) match
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
      case Right(query) =>
        val (queryResult, error) = CapiCqlString
          .build(query)
          .fold(e => (None, Some(CqlError(e.message))), str => (Some(str), None))

        for suggestions <- typeahead.getSuggestions(query)
        yield CqlResult(tokens, Some(query), queryResult, suggestions, error)
