import { either, Result } from "../utils/result";
import { Query } from "./ast";
import { queryStrFromQueryList } from "./capiQueryString";
import { Parser } from "./parser";
import { Scanner } from "./scanner";
import { Token } from "./token";
import { Typeahead } from "./typeahead";
import { TypeaheadSuggestion } from "./types";

export type CqlResult = {
  tokens: Token[];
  ast?: Query;
  suggestions: TypeaheadSuggestion[];
  queryResult?: string;
  error?: Error;
};

export class CqlResultEnvelope {
  constructor(public result: CqlResult) {}
}

export class Cql {
  constructor(public typeahead: Typeahead) {}

  public run = async (
    program: string,
    signal?: AbortSignal
  ): Promise<CqlResult> => {
    const scanner = new Scanner(program);
    const tokens = scanner.scanTokens();
    const parser = new Parser(tokens);
    const result = parser.parse();

    const eventuallyResult = either(result)(
      (error) =>
        Promise.resolve(
          new CqlResultEnvelope({
            tokens,
            error,
            suggestions: [],
          })
        ),
      async (queryArr) => {
        const suggestions = await this.typeahead.getSuggestions(
          queryArr,
          signal
        );
        const result = {
          tokens,
          ast: queryArr,
          suggestions,
        };

        const queryStringResult: Result<Error, string> =
          queryStrFromQueryList(queryArr);

        return either(queryStringResult)(
          (error) =>
            new CqlResultEnvelope({
              ...result,
              error,
            }),
          (queryResult) =>
            new CqlResultEnvelope({
              ...result,
              tokens,
              queryResult,
            })
        );
      }
    );

    const resultEnvelope = await eventuallyResult;

    return resultEnvelope.result;
  };
}
