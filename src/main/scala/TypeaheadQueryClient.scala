package cql

import cql.TypeaheadSuggestion

import scala.concurrent.Future

trait TypeaheadQueryClient {
  def getTags(str: String): Future[List[TypeaheadSuggestion]]
  def getSections(str: String): Future[List[TypeaheadSuggestion]]
}
