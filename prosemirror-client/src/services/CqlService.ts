export type CqlResult = {
  tokens: Array<Token>;
  ast?: QueryList;
  queryResult?: string;
  // Map from tokenType to a map of literals and their suggestions.
  // Avoiding TokenType as type to avoid serialisation shenanigans in prototype.
  suggestions: Array<TypeaheadSuggestion>;
  error?: CqlError;
};

export type CqlError = {
  position?: number,
  message: string;
}

export type TypeaheadSuggestion = {
  from: number;
  to: number;
  // The suffix to apply if this suggestion is accepted at the trailing edge of the query.
  // E.g. when we have typed '+ta' accept the key suggestion 'tag', we'll want to apply '+tag:'
  // to trigger typeahead for the value.
  suffix: string;
  suggestions: Suggestions;
};

type Suggestions = {
  TextSuggestion?: TextSuggestion;
  DateSuggestion: DateSuggestion;
};

type TextSuggestion = { suggestions: Array<TextSuggestionOption> };
type TextSuggestionOption = { label: string; value: string, description: string };
type DateSuggestion = { validFrom?: string; validTo?: string };

export interface CqlServiceInterface {
  setUrl(url: string): void;

  fetchResult(query: string): Promise<CqlResult>;

  cancel(): void;
}

export class CqlService implements CqlServiceInterface {
  private abortController: AbortController | undefined;

  constructor(private url: string) {}

  public setUrl(url: string) {
    this.url = url;
  }

  public async fetchResult(query: string) {
    this.abortController = new AbortController();
    const urlParams = new URLSearchParams();
    urlParams.append("query", query);
    const request = await fetch(`${this.url}/cql?${urlParams}`, {
      signal: this.abortController.signal,
    });

    return (await request.json()) as CqlResult;
  }

  public cancel() {
    this.abortController?.abort();
  }
}
