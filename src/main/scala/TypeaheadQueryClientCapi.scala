package cql

import cql.TypeaheadSuggestion

import scala.concurrent.Future
import com.gu.contentapi.client.{ContentApiClient, GuardianContentClient}
import scala.concurrent.ExecutionContext.Implicits.global


class TypeaheadQueryCapiClient(client: GuardianContentClient) extends TypeaheadQueryClient {
  def getTags(str: String): Future[List[TypeaheadSuggestion]] =
    val query = ContentApiClient.tags.q(str)
    client.getResponse(query).map { response =>
      response.results.map { tag =>
        TypeaheadSuggestion(tag.webTitle, tag.id)
      }.toList
    }

  def getSections(str: String): Future[List[TypeaheadSuggestion]] =
    val query = ContentApiClient.sections.q(str)
    client.getResponse(query).map { response =>
      response.results.map { section =>
        TypeaheadSuggestion(section.webTitle, section.id)
      }.toList
    }
}
