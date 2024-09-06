import { either, Result } from "../util/result";
import { QueryArray } from "./ast";
import { queryStrFromQueryArray } from "./capiQueryString";
import { Parser } from "./parser";
import { Scanner } from "./scanner";
import { Token } from "./token";
import { Typeahead, TypeaheadSuggestion } from "./typeahead";

export class CqlResult {
  constructor(
    public result: {
      tokens: Token[];
      ast?: QueryArray;
      suggestions?: TypeaheadSuggestion[];
      queryResult?: String;
      error?: Error;
    }
  ) {}
}

export class Cql {
  constructor(public typeahead: Typeahead) {}

  public run = (program: string): Promise<CqlResult> => {
    const scanner = new Scanner(program);
    const tokens = scanner.scanTokens();
    const parser = new Parser(tokens);
    const result = parser.parse();

    return either(result)(
      (error) =>
        Promise.resolve(
          new CqlResult({
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
          queryStrFromQueryArray(queryArr);

        return either(queryStringResult)(
          (error) =>
            new CqlResult({
              ...result,
              error,
            }),
          (queryResult) =>
            new CqlResult({
              ...result,
              tokens,
              queryResult,
            })
        );
      }
    );
  };
}
