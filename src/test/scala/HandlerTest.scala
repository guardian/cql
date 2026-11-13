package cql

import org.scalatest.matchers._
import org.scalatest.funspec.AnyFunSpec
import cql.lang.BaseTest
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent
import scala.jdk.CollectionConverters._

class HandlerTest extends AnyFunSpec with should.Matchers {
  val handler = new Handler()

  def assertIO(input: String, status: Int, output: String) =
    val request = new APIGatewayProxyRequestEvent()
      .withQueryStringParameters(Map("query" -> input).asJava)

    val response = handler.handleRequest(request, null)

    response.getStatusCode shouldBe status
    response.getBody.contains(output) shouldBe true

  describe("a program") {
    it("should give a 200 for a valid query") {
      assertIO("+format:json", 200, "format=json")
    }

    it("should return a parse error for an invalid query") {
      assertIO(
        "this AND",
        200,
        "There must be a query following 'AND', e.g. this AND that."
      )
    }
  }
}
