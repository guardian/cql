package cql

import scala.io.Source
import scala.util.{Failure, Success, Try}
import cql.grammar.{CqlResult, QueryList}
import io.circe.generic.semiauto.*
import io.circe.Encoder

import scala.concurrent.Future
import com.gu.contentapi.client.GuardianContentClient

class Cql:
  implicit val ec: scala.concurrent.ExecutionContext =
    scala.concurrent.ExecutionContext.global
  val guardianContentClient = new GuardianContentClient("test")
  val typeaheadClient = new TypeaheadQueryCapiClient(guardianContentClient)
  val typeahead = new Typeahead(typeaheadClient)

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
            CqlResult(tokens, Some(expr), None, suggestions, Some(e.getMessage))
        }
      case Failure(e) =>
        Future.successful(CqlResult(tokens, None, None, Map.empty, Some(e.getMessage)))
