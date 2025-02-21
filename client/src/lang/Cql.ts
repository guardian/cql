import { either, Result } from "../utils/result";
import { CqlQuery } from "./ast";
import { queryStrFromQueryList } from "./capiQueryString";
import { Parser } from "./parser";
import { Scanner } from "./scanner";
import { Token } from "./token";

export interface CqlResult {
  tokens: Token[];
  queryAst?: CqlQuery;
  queryStr?: string;
  error?: Error;
}

export class CqlResultEnvelope implements CqlResult {
  constructor(
    public tokens: Token[],
    public queryAst?: CqlQuery,
    public queryStr?: string,
    public error?: Error
  ) {}
}

export const parseCqlStr = (queryStr: string) => {
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
