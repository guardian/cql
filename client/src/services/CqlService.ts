import { CqlQuery } from "../lang/ast";
import { Cql, CqlResult } from "../lang/Cql";
import { Typeahead, TypeaheadField } from "../lang/typeahead";
import { TypeaheadSuggestion } from "../lang/types";

export type CqlError = {
  position?: number;
  message: string;
};

export interface CqlServiceInterface {
  parseCqlStr(queryStr: string): CqlResult;
  fetchSuggestions(query: CqlQuery): Promise<TypeaheadSuggestion[]>;
}

export class CqlClientService implements CqlServiceInterface {
  private abortController: AbortController | undefined;
  private cql: Cql;

  constructor(resolvers: TypeaheadField[]) {
    const typeahead = new Typeahead(resolvers);
    this.cql = new Cql(typeahead);
  }

  public parseCqlStr(queryStr: string) {
    return this.cql.parse(queryStr);
  }

  public fetchSuggestions(query: CqlQuery): Promise<TypeaheadSuggestion[]> {
    return new Promise((resolve, reject) => {
      // Abort existing fetch, if it exists
      this.abortController?.abort();

      const abortController = new AbortController();
      this.abortController = abortController;
      abortController.signal.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });

      this.cql
        .getSuggestions(query, abortController.signal)
        .then(resolve)
        .catch(reject);
    });
  }
}
