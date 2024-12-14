package cql

import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.amazonaws.services.lambda.runtime.events.{
  APIGatewayProxyRequestEvent,
  APIGatewayProxyResponseEvent
}
import io.circe.syntax._
import util.Logging

import scala.util.Try
import scala.concurrent.Await
import scala.concurrent.duration.DurationInt
import scala.jdk.CollectionConverters._
import scala.concurrent.Future
import com.gu.contentapi.client.GuardianContentClient
import cql.lang.{Cql, Typeahead, TypeaheadHelpersCapi}
class Handler
    extends RequestHandler[
      APIGatewayProxyRequestEvent,
      APIGatewayProxyResponseEvent
    ]
    with Logging {
  private implicit val ec: scala.concurrent.ExecutionContext =
    scala.concurrent.ExecutionContext.global

  val guardianContentClient = new GuardianContentClient("test")
  val typeaheadHelpers = new TypeaheadHelpersCapi(guardianContentClient)
  val typeahead = new Typeahead(
    typeaheadHelpers.fieldResolvers,
    typeaheadHelpers.outputModifierResolvers
  )

  private val cql = new Cql(typeahead)

  def handleRequest(
      event: APIGatewayProxyRequestEvent,
      context: Context
  ): APIGatewayProxyResponseEvent = {
    logger.info(
      "Received request with params: " + event
        .getCqlStringParameters()
        .toString()
    )

    val eventualResult = event
      .getCqlStringParameters()
      .asScala
      .get("query")
      .map(query =>
        cql
          .run(query)
          .map(r =>
            Try {
              (200, r.asJson.spaces2)
            }.recover { e =>
              logger.error("Server error", e)
              (500, e.getMessage())
            }.get
          )
          .recover { e =>
            logger.error("Bad request", e)
            (400, e.getMessage())
          }
      )
      .getOrElse(
        Future.successful(
          (
            400,
            "No query specified. Supply a URL parameter for `query`, e.g. ?query=example"
          )
        )
      )

    val (statusCode, responseBody) = Await.result(eventualResult, 5.seconds)

    logger.info(s"Responding with status ${statusCode}: ${responseBody}")

    new APIGatewayProxyResponseEvent()
      .withHeaders(
        Map(
          "Access-Control-Allow-Origin" -> "*"
        ).asJava
      )
      .withStatusCode(statusCode)
      .withBody(
        responseBody
      )
  }
}
