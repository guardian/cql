package cql

import cql.TypeaheadTextSuggestion

import scala.concurrent.Future

trait TypeaheadQueryClient {
  def getTags(str: String): Future[List[TypeaheadTextSuggestion]]
  def getSections(str: String): Future[List[TypeaheadTextSuggestion]]
}
