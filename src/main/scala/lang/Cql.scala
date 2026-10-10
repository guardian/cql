package cql.lang

import scala.concurrent.{ExecutionContext, Future}
import io.circe.Encoder

case class CqlError(message: String, position: Option[Int] = None)
    derives Encoder.AsObject

case class CqlResult(
    tokens: List[Token],
    ast: Option[CqlQuery],
    queryResult: Option[String],
    error: Option[CqlError]
) derives Encoder.AsObject

class Cql():
  def toAst(query: String)(using ExecutionContext): CqlResult =
    val tokens = Scanner.scan(query)

    Parser.parse(tokens) match
      case Left(ParseError(position, message)) =>
        CqlResult(
          tokens,
          None,
          None,
          Some(CqlError(message, Some(position)))
        )
      case Right(query) =>
        val (queryResult, error) = CapiCqlString
          .build(query)
          .fold(e => (None, Some(CqlError(e.message))), str => (Some(str), None))

        CqlResult(tokens, Some(query), queryResult, error)
