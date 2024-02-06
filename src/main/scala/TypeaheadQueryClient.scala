package cql

import cql.TypeaheadSuggestion
import scala.concurrent.Future

trait TypeaheadQueryClient {
  def getTags(str: String): Future[List[TypeaheadSuggestion]]
  def getSections(str: String): Future[List[TypeaheadSuggestion]]
}

class TypeaheadQueryCapiClient extends TypeaheadQueryClient {
  def getTags(str: String): Future[List[TypeaheadSuggestion]] =
    Future.successful(List(TypeaheadSuggestion("tags-are-magic", "Tags are magic")))

  def getSections(str: String): Future[List[TypeaheadSuggestion]] =
    Future.successful(List(TypeaheadSuggestion("sections-are-magic", "Also sections")))
}
