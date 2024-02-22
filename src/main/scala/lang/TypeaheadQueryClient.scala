package cql.lang

import scala.concurrent.Future

trait TypeaheadQueryClient {
  def getTags(str: String): Future[List[TextSuggestionOption]]
  def getSections(str: String): Future[List[TextSuggestionOption]]
}
