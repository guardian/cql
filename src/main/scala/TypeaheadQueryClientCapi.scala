package cql

import cql.TextSuggestionOption

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
        TextSuggestionOption(tag.webTitle, tag.id)
      }.toList
    }

  def getSections(str: String): Future[List[TextSuggestionOption]] =
    val query = str match
      case ""  => ContentApiClient.sections
      case str => ContentApiClient.sections.q(str)
    client.getResponse(query).map { response =>
      response.results.map { section =>
        TextSuggestionOption(section.webTitle, section.id)
      }.toList
    }
}
