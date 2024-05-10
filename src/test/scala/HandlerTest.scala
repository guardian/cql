package cql

import org.scalatest.matchers._
import org.scalatest.funspec.AnyFunSpec
import cql.lang.BaseTest
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent

class HandlerTest extends AnyFunSpec with should.Matchers {
  val handler = new Handler()

  def assertIO(input: String, status: Int, output: String) =
    val request = new APIGatewayProxyRequestEvent().withBody(input)

    val response = handler.handleRequest(request, null)

    response.getBody.contains(output) shouldBe true

  describe("a program") {
    it("should give a 200 for a valid query") {
      assertIO("+section:commentisfree", 200, "section=commentisfree")
    }

    it("should give a 400 for an invalid query") {
      assertIO("this AND", 200, "There must be a query following 'AND', e.g. this AND that.")
    }
  }
}
