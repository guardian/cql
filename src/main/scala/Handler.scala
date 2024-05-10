package cql

import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.amazonaws.services.lambda.runtime.events.{
  APIGatewayProxyRequestEvent,
  APIGatewayProxyResponseEvent
}
import io.circe.generic.auto._
import io.circe.syntax._
import util.Logging
import cql.lang.Cql
import scala.util.Try
import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

class Handler
    extends RequestHandler[
      APIGatewayProxyRequestEvent,
      APIGatewayProxyResponseEvent
    ]
    with Logging with QueryJson {
  private implicit val ec: scala.concurrent.ExecutionContext =
    scala.concurrent.ExecutionContext.global
  private val cql = new Cql()

  def handleRequest(
      event: APIGatewayProxyRequestEvent,
      context: Context
  ): APIGatewayProxyResponseEvent = {
    logger.info("Received request with body: " + event.getBody)

    val eventualResult = cql
      .run(event.getBody)
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

    val (statusCode, responseBody) = Await.result(eventualResult, 5.seconds)

    logger.info(s"Responding with status ${statusCode}: ${responseBody}")

    new APIGatewayProxyResponseEvent()
      .withStatusCode(statusCode)
      .withBody(
        responseBody
      )
  }
}
