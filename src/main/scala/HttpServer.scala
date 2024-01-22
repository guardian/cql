package cql

import cql.Cql
import org.apache.pekko
import pekko.actor.typed.ActorSystem
import pekko.actor.typed.scaladsl.Behaviors
import pekko.http.scaladsl.Http
import pekko.http.scaladsl.model._
import pekko.http.scaladsl.server.Directives._
import com.github.pjfanning.pekkohttpcirce._
import io.circe.Decoder.Result
import io.circe.{Decoder, Encoder, HCursor, Json}
import com.github.pjfanning.pekkohttpcirce._

import scala.io.StdIn

trait QueryListSerde extends ErrorAccumulatingCirceSupport {
  implicit val queryList = deriveDecoder
  implicit val queryBinary = deriveDecoder
  implicit val queryContent = deriveDecoder
  implicit val queryGroup = deriveDecoder
  implicit val queryStr = deriveDecoder
  implicit val queryMeta = deriveDecoder
}

object HttpServer extends QueryListSerde {
  val cql = new Cql()

  def run(): Unit = {

    implicit val system = ActorSystem(Behaviors.empty, "my-system")
    // needed for the future flatMap/onComplete in the end
    implicit val executionContext = system.executionContext

    val route =
      path("query") {
        post {
          entity(as[String]) { query =>
            complete {
              cql.run(query)
            }
          }
        }
      }

    val bindingFuture = Http().newServerAt("localhost", 5050).bind(route)

    println(s"Server now online. Please navigate to http://localhost:5050/query\nPress RETURN to stop...")
    StdIn.readLine() // let it run until user presses return
    bindingFuture
      .flatMap(_.unbind()) // trigger unbinding from the port
      .onComplete(_ => system.terminate()) // and shutdown when done
  }
}
