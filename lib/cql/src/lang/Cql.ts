import { either, Result } from "../utils/result";
import { CqlQuery } from "./ast";
import { queryStrFromQueryList } from "./capiQueryString";
import { Parser } from "./parser";
import { Scanner, ScannerSettings } from "./scanner";
import { Token } from "./token";

export interface CqlResult {
  tokens: Token[];
  queryAst?: CqlQuery;
  queryStr?: string;
  error?: Error;
}

class CqlResultEnvelope implements CqlResult {
  constructor(
    public tokens: Token[],
    public queryAst?: CqlQuery,
    public queryStr?: string,
    public error?: Error,
  ) {}
}

export const parseCqlStr = (
  queryStr: string,
  scannerSettings?: Partial<ScannerSettings>,
) => {
  const scanner = new Scanner(queryStr, scannerSettings);
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
        (queryResult) => new CqlResultEnvelope(tokens, query, queryResult),
      );
    },
  );
};
