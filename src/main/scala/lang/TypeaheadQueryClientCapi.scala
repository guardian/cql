package cql.lang

import scala.concurrent.Future
import com.gu.contentapi.client.{ContentApiClient, GuardianContentClient}
import scala.concurrent.ExecutionContext.Implicits.global

class TypeaheadQueryCapiClient(client: GuardianContentClient)
    extends TypeaheadQueryClient {
  def getTags(str: String): Future[List[TextSuggestionOption]] =
    val query = str match
      case ""  => ContentApiClient.tags
      case str => ContentApiClient.tags.q(str)
    client.getResponse(query).map { response =>
      response.results.map { tag =>
        TextSuggestionOption(tag.webTitle, tag.id, tag.description.getOrElse(""))
      }.toList
    }

  def getSections(str: String): Future[List[TextSuggestionOption]] =
    val query = str match
      case ""  => ContentApiClient.sections
      case str => ContentApiClient.sections.q(str)
    client.getResponse(query).map { response =>
      response.results.map { section =>
        TextSuggestionOption(section.webTitle, section.id, section.webTitle)
      }.toList
    }
}

class TypeaheadQueryClientTest extends TypeaheadQueryClient {
  def getTags(str: String): Future[List[TextSuggestionOption]] =
    Future.successful(
      List(TextSuggestionOption("Tags are magic", "tags-are-magic", "A magic tag"))
    )

  def getSections(str: String): Future[List[TextSuggestionOption]] =
    Future.successful(
      List(TextSuggestionOption("Also sections", "sections-are-magic", "Sections are less magic"))
    )
}
