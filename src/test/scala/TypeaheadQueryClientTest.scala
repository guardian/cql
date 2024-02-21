package cql

import cql.{TypeaheadQueryClient, TypeaheadTextSuggestion}

import scala.concurrent.Future

class TypeaheadQueryClientTest extends TypeaheadQueryClient {
  def getTags(str: String): Future[List[TypeaheadTextSuggestion]] =
    Future.successful(
      List(TypeaheadTextSuggestion("Tags are magic", "tags-are-magic"))
    )

  def getSections(str: String): Future[List[TypeaheadTextSuggestion]] =
    Future.successful(
      List(TypeaheadTextSuggestion("Also sections", "sections-are-magic"))
    )
}
