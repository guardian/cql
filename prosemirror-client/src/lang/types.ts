export class TypeaheadSuggestion<T extends TypeaheadType = TypeaheadType> {
  constructor(
    public readonly from: number,
    public readonly to: number,
    public readonly suggestions: SuggestionTypeMap[T][],
    public readonly type: T,
    // The suffix to apply if this suggestion is accepted at the trailing edge of the query.
    // E.g. when we have typed '+ta' accept the key suggestion 'tag', we'll want to apply '+tag:'
    // to trigger typeahead for the value.
    public readonly suffix?: string
  ) {}
}

type SuggestionTypeMap = {
  TEXT: TextSuggestionOption;
  DATE: DateSuggestion;
};

export type Suggestion = TextSuggestionOption | DateSuggestion;

export class TextSuggestionOption {
  public constructor(
    public readonly label: string,
    public readonly value: string,
    public readonly description?: string
  ) {}
}

export class DateSuggestion {
  constructor(
    public readonly validFrom?: string,
    public readonly validTo?: string
  ) {}
}

export type TypeaheadType = keyof SuggestionTypeMap;
