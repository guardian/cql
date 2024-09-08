import { either, Result } from "../util/result";
import { QueryList } from "./ast";
import { queryStrFromQueryList } from "./capiQueryString";
import { Parser } from "./parser";
import { Scanner } from "./scanner";
import { Token } from "./token";
import { Typeahead } from "./typeahead";
import { TypeaheadSuggestion } from "./types";

export type CqlResult = {
  tokens: Token[];
  ast?: QueryList;
  suggestions?: TypeaheadSuggestion[];
  queryResult?: string;
  error?: Error;
};

export class CqlResultEnvelope {
  constructor(public result: CqlResult) {}
}

export class Cql {
  constructor(public typeahead: Typeahead) {}

  public run = (program: string): Promise<CqlResult> => {
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
          })
        ),
      async (queryArr) => {
        const suggestions = await this.typeahead.getSuggestions(queryArr);

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
    return eventuallyResult.then((resultEnvelope) => resultEnvelope.result);
  };
}
