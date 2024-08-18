import { Token } from "../Query"
import { QueryList } from "./ast"
import { Scanner } from "./scanner"

type CqlError = { message: String, position?: number }

export type CqlResult = {
    tokens: Token[],
    ast?: QueryList,
    queryResult?: String,
    // Map from tokenType to a map of literals and their suggestions.
    // Avoiding TokenType as type to avoid serialisation shenanigans in prototype.
    suggestions: Array<TypeaheadSuggestion>,
    error?: CqlError
}

class Cql {
  constructor(public typeahead: Typeahead) {}

  public run = (program: string): Promise<CqlResult> => {
    const scanner = new Scanner(program)
    const tokens = scanner.scanTokens()
    const parser = new Parser(tokens)

    try {
      parser.parse() match
      case Success(expr) =>
        typeahead.getSuggestions(expr).map { suggestions =>
          Try { CapiQueryString.build(expr) } match
            case Success(capiQueryStr) =>
              CqlResult(
                tokens,
                Some(expr),
                Some(capiQueryStr),
                suggestions,
                None
              )
            case Failure(e: Throwable) =>
              CqlResult(
                tokens,
                Some(expr),
                None,
                suggestions,
                Some(CqlError(e.getMessage, None))
              )
        }
      case Failure(e) =>
        val error = e match {
          case ParseError(position, message) =>
            CqlError(message, Some(position))
          case e: Throwable => CqlError(e.getMessage)
        }

        Future.successful(
          CqlResult(
            tokens,
            None,
            None,
            List.empty,
            Some(error)
          )
        )
      }
}
