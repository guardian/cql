import cql.TypeaheadSuggestion

import scala.concurrent.Future

trait TypeaheadQueryClient {
  def getTags: Future[List[TypeaheadSuggestion]]
  def getSections: Future[List[TypeaheadSuggestion]]
}

class TypeaheadQueryCapiClient extends TypeaheadQueryClient {
  def getTags =
    Future.successful(List(TypeaheadSuggestion("tags-are-magic", "Tags are magic")))

  def getSections =
    Future.successful(List(TypeaheadSuggestion("sections-are-magic", "Also sections")))
}
