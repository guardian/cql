package cql

import org.apache.pekko
import pekko.actor.typed.ActorSystem
import pekko.actor.typed.scaladsl.Behaviors
import pekko.http.scaladsl.Http
import pekko.http.scaladsl.model.*
import pekko.http.scaladsl.server.Directives.*
import io.circe.syntax.*
import com.github.pjfanning.pekkohttpcirce.*
import scala.io.StdIn
import scala.util.{Failure, Success, Try}
import cql.lang.Cql

object HttpServer extends QueryJson {
  val cql = new Cql()

  def run(): Unit = {

    implicit val system = ActorSystem(Behaviors.empty, "my-system")
    // needed for the future flatMap/onComplete in the end
    implicit val executionContext = system.executionContext

    val responseHeaders: List[HttpHeader] = List(
      headers.`Access-Control-Allow-Origin`.`*`
    )

    val route =
      path("cql") {
        get {
          parameters("query") { query =>
            complete {
              val result = cql.run(query)
              result
                .map { r =>
                  Try {
                    HttpResponse(
                      status = 200,
                      entity = r.asJson.spaces2,
                      headers = responseHeaders
                    )
                  }.recover { e =>
                    e.printStackTrace()
                    HttpResponse(
                      status = 500,
                      entity = e.getMessage(),
                      headers = responseHeaders
                    )
                  }.get
                }
                .recover { e =>
                  HttpResponse(
                    status = 400,
                    entity = e.getMessage(),
                    headers = responseHeaders
                  )
                }
            }
          }
        }
      }

    val bindingFuture = Http().newServerAt("localhost", 5050).bind(route)

    println(
      s"Server now online. Please navigate to http://localhost:5050/query\nPress RETURN to stop..."
    )
    StdIn.readLine() // let it run until user presses return
    bindingFuture
      .flatMap(_.unbind()) // trigger unbinding from the port
      .onComplete(_ => system.terminate()) // and shutdown when done
  }
}
