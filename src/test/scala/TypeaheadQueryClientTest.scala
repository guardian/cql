package cql

import cql.{TypeaheadQueryClient, TypeaheadSuggestion}

import scala.concurrent.Future

class TypeaheadQueryClientTest extends TypeaheadQueryClient {
  def getTags(str: String): Future[List[TypeaheadSuggestion]] =
    Future.successful(
      List(TypeaheadSuggestion("Tags are magic", "tags-are-magic"))
    )

  def getSections(str: String): Future[List[TypeaheadSuggestion]] =
    Future.successful(
      List(TypeaheadSuggestion("Also sections", "sections-are-magic"))
    )
}
