package cql.lang

import scala.concurrent.Future
import concurrent.ExecutionContext.Implicits.global
import io.circe.Encoder

case class TypeaheadSuggestion(
    from: Int,
    to: Int,
    // The suffix to apply if this suggestion is accepted at the trailing edge of the query.
    // E.g. when we have typed '+ta' accept the key suggestion 'tag', we'll want to apply '+tag:'
    // to trigger typeahead for the value.
    suffix: String = "",
    suggestions: Suggestions
) derives Encoder.AsObject

sealed trait Suggestions

case class TextSuggestion(suggestions: List[TextSuggestionOption])
    extends Suggestions derives Encoder.AsObject

case class TextSuggestionOption(
    label: String,
    value: String,
    description: Option[String] = None
) derives Encoder.AsObject

case class DateSuggestion(validFrom: Option[String], validTo: Option[String])
    extends Suggestions derives Encoder.AsObject

type TypeaheadResolver = (String => Future[List[TextSuggestionOption]]) |
  List[TextSuggestionOption]

enum TypeaheadType:
  case TEXT, DATE

case class TypeaheadField(
    id: String,
    name: String,
    description: String,
    resolver: TypeaheadResolver = List.empty,
    suggestionType: TypeaheadType = TypeaheadType.TEXT
):
  def resolveSuggestions(str: String): Future[List[TextSuggestionOption]] =
    resolver match
      case list: List[TextSuggestionOption] =>
        Future.successful(list.filter(_.label.contains(str)))
      case resolverFn: (String => Future[List[TextSuggestionOption]]) =>
        resolverFn(str)

  def toSuggestionOption: TextSuggestionOption =
    TextSuggestionOption(name, id, Some(description))

class Typeahead(
    typeaheadFields: List[TypeaheadField],
    outputModifierResolvers: List[TypeaheadField]
):
  private val allFields = typeaheadFields ++ outputModifierResolvers

  private val typeaheadFieldEntries = TextSuggestion(
    allFields.map { case TypeaheadField(id, label, description, _, _) =>
      TextSuggestionOption(label, id, Some(description))
    }.toList
  )

  def getSuggestions(
      program: CqlQuery
  ): Future[List[TypeaheadSuggestion]] =
    program.content match
      case None => Future.successful(List.empty)
      case Some(content) =>
        Future
          .traverse(CqlUtils.getCqlFieldsFromCqlBinary(content))(suggestCqlField)
          .map(_.flatten)

  private def getSuggestionsForKeyToken(keyToken: Token) =
    Future.successful(suggestFieldKey(keyToken.literal.getOrElse("")).map {
      suggestions =>
        TypeaheadSuggestion(
          keyToken.start,
          keyToken.end,
          ":",
          suggestions
        )
    }.toList)

  private def suggestCqlField(
      q: CqlField
  ): Future[List[TypeaheadSuggestion]] =
    q match
      case CqlField(keyToken, None) =>
        getSuggestionsForKeyToken(keyToken)
      case CqlField(keyToken, Some(valueToken)) =>
        val keySuggestions = getSuggestionsForKeyToken(keyToken)
        val valueSuggestions =
          suggestFieldValue(
            keyToken.literal.getOrElse(""),
            valueToken.literal.getOrElse("")
          )
            .map {
              _.map { suggestions =>
                TypeaheadSuggestion(
                  valueToken.start,
                  valueToken.end,
                  " ",
                  suggestions
                )
              }
            }
        Future.sequence(List(keySuggestions, valueSuggestions)).map(_.flatten)

  private def suggestFieldKey(str: String): Option[TextSuggestion] =
    str match
      case "" => Some(typeaheadFieldEntries)
      case str =>
        typeaheadFieldEntries.suggestions
          .filter(_.value.contains(str.toLowerCase())) match
          case suggestions @ nonEmptyList :: Nil =>
            Some(
              typeaheadFieldEntries.copy(
                suggestions = suggestions
              )
            )
          case _ => None

  private def suggestFieldValue(
      key: String,
      str: String
  ): Future[Option[Suggestions]] =
    allFields
      .find(_.id == key)
      .map {
        case typeaheadField
            if typeaheadField.suggestionType == TypeaheadType.DATE =>
          Future.successful(Some(DateSuggestion(None, None)))
        case textField =>
          textField
            .resolveSuggestions(str)
            .map(options => Some(TextSuggestion(options)))
      }
      .getOrElse(Future.successful(None))
