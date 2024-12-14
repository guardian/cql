import { either, Result } from "../utils/result";
import { CqlQuery } from "./ast";
import { queryStrFromQueryList } from "./capiQueryString";
import { Parser } from "./parser";
import { Scanner } from "./scanner";
import { Token } from "./token";
import { Typeahead } from "./typeahead";
import { TypeaheadSuggestion } from "./types";

export interface CqlResult {
  tokens: Token[];
  query?: CqlQuery;
  queryResult?: string;
  error?: Error;
}

export class CqlResultEnvelope implements CqlResult {
  constructor(
    public tokens: Token[],
    public query?: CqlQuery,
    public queryResult?: string,
    public error?: Error
  ) {}
}

export class Cql {
  constructor(public typeahead: Typeahead) {}

  public parse = (queryStr: string) => {
    const scanner = new Scanner(queryStr);
    const tokens = scanner.scanTokens();
    const parser = new Parser(tokens);
    const result = parser.parse();

    return either(result)(
      (error) => new CqlResultEnvelope(tokens, undefined, undefined, error),
      (query) => {
        const queryStringResult: Result<Error, string> =
          queryStrFromQueryList(query);

        return either(queryStringResult)(
          (error) => new CqlResultEnvelope(tokens, query, undefined, error),
          (queryResult) => new CqlResultEnvelope(tokens, query, queryResult)
        );

      }
    );
  };

  public getSuggestions(
    query: CqlQuery,
    signal?: AbortSignal
  ): Promise<TypeaheadSuggestion[]> {
    return this.typeahead.getSuggestions(query, signal);
  }
}
