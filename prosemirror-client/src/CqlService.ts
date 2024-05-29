export type CqlResult = {
  tokens: Array<Token>;
  ast?: QueryList;
  queryResult?: String;
  // Map from tokenType to a map of literals and their suggestions.
  // Avoiding TokenType as type to avoid serialisation shenanigans in prototype.
  suggestions: Array<TypeaheadSuggestion>;
  error?: string;
};

export type TypeaheadSuggestion = {
  from: number;
  to: number;
  // The suffix to apply if this suggestion is accepted at the trailing edge of the query.
  // E.g. when we have typed '+ta' accept the key suggestion 'tag', we'll want to apply '+tag:'
  // to trigger typeahead for the value.
  suffix: String;
  suggestions: Suggestions;
};

type Suggestions = TextSuggestion | DateSuggestion;

type TextSuggestion = { suggestions: Array<TextSuggestionOption> };
type TextSuggestionOption = { label: String; value: String };
type DateSuggestion = { validFrom?: String; validTo?: String };

export class CqlService {
  constructor(private url: string) {}

  public async fetchResult(query: string) {
    const urlParams = new URLSearchParams();
    urlParams.append("query", query);
    const request = await fetch(`${this.url}/cql?${urlParams}`);

    return (await request.json()) as CqlResult;
  }
}
