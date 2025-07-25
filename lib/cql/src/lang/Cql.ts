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
    public originalQuery: string,
    public queryAst?: CqlQuery,
    public queryStr?: string,
    public error?: Error,
  ) {}
}

export const createParser =
  (scannerSettings?: Partial<ScannerSettings>) => (queryStr: string) => {
    const scanner = new Scanner(queryStr, scannerSettings);
    const tokens = scanner.scanTokens();
    const parser = new Parser(tokens);
    const result = parser.parse();

    return either(result)(
      (error) =>
        new CqlResultEnvelope(tokens, queryStr, undefined, undefined, error),
      (query) => {
        const queryStringResult: Result<Error, string> =
          queryStrFromQueryList(query);

        return either(queryStringResult)(
          (error) =>
            new CqlResultEnvelope(tokens, queryStr, query, undefined, error),
          (queryResult) =>
            new CqlResultEnvelope(tokens, queryStr, query, queryResult),
        );
      },
    );
  };
