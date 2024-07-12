package cql.lang

import scala.concurrent.Future
import concurrent.ExecutionContext.Implicits.global

case class TypeaheadSuggestion(
    from: Int,
    to: Int,
    // The suffix to apply if this suggestion is accepted at the trailing edge of the query.
    // E.g. when we have typed '+ta' accept the key suggestion 'tag', we'll want to apply '+tag:'
    // to trigger typeahead for the value.
    suffix: String = "",
    suggestions: Suggestions
)

sealed trait Suggestions

case class TextSuggestion(suggestions: List[TextSuggestionOption])
    extends Suggestions

case class TextSuggestionOption(
    label: String,
    value: String,
    description: String
)

case class DateSuggestion(validFrom: Option[String], validTo: Option[String])
    extends Suggestions

type TypeaheadResolver = (String => Future[List[TextSuggestionOption]]) |
  List[TextSuggestionOption]

type TypeaheadType = "TEXT" | "DATE"

case class TypeaheadField(
    id: String,
    name: String,
    description: String,
    resolver: TypeaheadResolver,
    suggestionType: "TEXT" | "DATE" = "TEXT"
):
  def resolveSuggestions(str: String): Future[List[TextSuggestionOption]] =
    resolver match {
      case list: List[TextSuggestionOption] =>
        Future.successful(list.filter { _.label.contains(str) })
      case resolverFn: (String => Future[List[TextSuggestionOption]]) =>
        resolverFn(str)
    }

  def toSuggestionOption: TextSuggestionOption =
    TextSuggestionOption(name, id, description)

class Typeahead(
    fieldResolvers: List[TypeaheadField],
    outputModifierResolvers: List[TypeaheadField]
) {
  private val typeaheadTokenResolverMap = Map(
    TokenType.QUERY_FIELD_KEY -> suggestFieldKey,
    TokenType.QUERY_OUTPUT_MODIFIER_KEY -> suggestOutputModifierKey,
    TokenType.QUERY_VALUE -> suggestFieldValue
  )

  private val typeaheadFieldEntries = TextSuggestion(
    fieldResolvers.map { case TypeaheadField(id, label, description, _, _) =>
      TextSuggestionOption(label, id, description)
    }.toList
  )

  def getSuggestions(
      program: QueryList
  ): Future[List[TypeaheadSuggestion]] =
    Future
      .traverse(program.exprs) {
        case q: QueryField =>
          suggestQueryField(q)
        case q: QueryOutputModifier =>
          suggestQueryOutputModifier(q)
        case _ => Future.successful(List.empty)
      }
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

  private def suggestQueryField(
      q: QueryField
  ): Future[List[TypeaheadSuggestion]] =
    q match {
      case QueryField(keyToken, None) =>
        getSuggestionsForKeyToken(keyToken)
      case QueryField(keyToken, Some(valueToken)) =>
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
    }

  private def suggestQueryOutputModifier(
      q: QueryOutputModifier
  ): Future[List[TypeaheadSuggestion]] =
    q match {
      case QueryOutputModifier(keyToken, None) =>
        suggestOutputModifierKey(keyToken.literal.getOrElse("")).map {
          suggestions =>
            List(
              TypeaheadSuggestion(
                keyToken.start,
                keyToken.end,
                ":",
                suggestions
              )
            )
        }
      case QueryOutputModifier(keyToken, Some(valueToken)) =>
        val keySuggestion = suggestOutputModifierKey(
          keyToken.literal.getOrElse("")
        ).map { suggestion =>
          TypeaheadSuggestion(
            keyToken.start,
            keyToken.end,
            ":",
            suggestion
          )
        }
        val valueSuggestion = suggestOutputModifierValue(
          keyToken.literal.getOrElse(""),
          valueToken.literal.getOrElse("")
        ).map { suggestions =>
          TypeaheadSuggestion(
            keyToken.start,
            keyToken.end,
            ":",
            suggestions
          )
        }

        Future.sequence(List(keySuggestion, valueSuggestion))
    }

  private def suggestFieldKey(str: String): Option[TextSuggestion] =
    str match
      case "" => Some(typeaheadFieldEntries)
      case str =>
        typeaheadFieldEntries.suggestions
          .filter(_.value.contains(str.toLowerCase())) match {
          case suggestions @ nonEmptyList :: Nil =>
            Some(
              typeaheadFieldEntries.copy(
                suggestions = suggestions
              )
            )
          case _ => None
        }

  private def suggestFieldValue(
      key: String,
      str: String
  ): Future[Option[Suggestions]] =
    fieldResolvers
      .find(_.id == key)
      .map {
        case typeaheadField if typeaheadField.suggestionType == "DATE" =>
          Future.successful(Some(DateSuggestion(None, None)))
        case textField =>
          textField
            .resolveSuggestions(str)
            .map(options => Some(TextSuggestion(options)))
      }
      .getOrElse(Future.successful(None))

  private def suggestOutputModifierKey(str: String): Future[TextSuggestion] =
    Future.successful(
      TextSuggestion(
        outputModifierResolvers
          .filter(
            _.id.contains(str.toLowerCase())
          )
          .map(_.toSuggestionOption)
      )
    )

  private def suggestOutputModifierValue(
      key: String,
      str: String
  ): Future[TextSuggestion | DateSuggestion] =
    outputModifierResolvers.find(_.name == key) match
      case Some(typeaheadField) if typeaheadField.suggestionType == "TEXT" =>
        typeaheadField.resolveSuggestions(str).map { suggestions =>
          TextSuggestion(
            suggestions
              .filter(
                _.label.contains(
                  str.toLowerCase()
                )
              )
          )
        }
      // Todo: date validation based on rest of AST
      case Some(typeaheadField) if typeaheadField.suggestionType == "DATE" =>
        Future.successful(DateSuggestion(None, None))
      case _ => Future.successful(TextSuggestion(List.empty))
}
