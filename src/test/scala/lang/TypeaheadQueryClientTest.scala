package cql.lang

import scala.concurrent.Future

class TypeaheadQueryClientTest extends TypeaheadQueryClient {
  def getTags(str: String): Future[List[TextSuggestionOption]] =
    Future.successful(
      List(TextSuggestionOption("Tags are magic", "tags-are-magic"))
    )

  def getSections(str: String): Future[List[TextSuggestionOption]] =
    Future.successful(
      List(TextSuggestionOption("Also sections", "sections-are-magic"))
    )
}
