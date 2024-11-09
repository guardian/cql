import { Query } from "../lang/ast";
import { Cql, CqlResult } from "../lang/Cql";
import { Typeahead, TypeaheadField } from "../lang/typeahead";
import { TypeaheadSuggestion } from "../lang/types";

export type CqlError = {
  position?: number;
  message: string;
};

export interface CqlServiceInterface {
  parseCqlQueryStr(queryStr: string): CqlResult;
  fetchSuggestions(query: Query): Promise<TypeaheadSuggestion[]>;
  cancelSuggestions(): void;
}

export class CqlClientService implements CqlServiceInterface {
  private abortController: AbortController | undefined;
  private cql: Cql;

  constructor(resolvers: TypeaheadField[]) {
    const typeahead = new Typeahead(resolvers);
    this.cql = new Cql(typeahead);
  }

  public parseCqlQueryStr(queryStr: string) {
    this.abortController = new AbortController();

    return this.cql.parse(queryStr);
  }

  public fetchSuggestions(query: Query): Promise<TypeaheadSuggestion[]> {
    this.abortController = new AbortController();

    return new Promise((resolve, reject) => {
      if (this.abortController) {
        this.abortController.signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      }
      this.cql.getSuggestions(query).then(resolve);
    });
  }

  public cancelSuggestions() {
    this.abortController?.abort();
  }
}
