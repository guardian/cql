import { CqlQuery } from "../lang/ast";
import { Typeahead, TypeaheadField } from "../lang/typeahead";
import { TypeaheadSuggestion } from "../lang/types";

export type CqlError = {
  position?: number;
  message: string;
};

export class CqlSuggestionService {
  private abortController: AbortController | undefined;
  private typeahead: Typeahead;

  constructor(public resolvers: TypeaheadField[]) {
    this.typeahead = new Typeahead(resolvers);
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

      this.typeahead
        .getSuggestions(query, abortController.signal)
        .then(resolve)
        .catch(reject);
    });
  }
}
