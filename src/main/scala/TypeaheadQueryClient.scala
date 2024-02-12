package cql

import cql.TypeaheadSuggestion
import scala.concurrent.Future

trait TypeaheadQueryClient {
  def getTags(str: String): Future[List[TypeaheadSuggestion]]
  def getSections(str: String): Future[List[TypeaheadSuggestion]]
}

class TypeaheadQueryCapiClient extends TypeaheadQueryClient {
  def getTags(str: String): Future[List[TypeaheadSuggestion]] =
    Future.successful(
      List(TypeaheadSuggestion("Tags are magic", "tags-are-magic"))
    )

  def getSections(str: String): Future[List[TypeaheadSuggestion]] =
    Future.successful(
      List(TypeaheadSuggestion("Also sections", "sections-are-magic"))
    )
}
