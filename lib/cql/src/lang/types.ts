type BaseSuggestion = {
  readonly from: number;
  readonly to: number;
  readonly position: "queryStr" | "chipKey" | "chipValue";

  // The suffix to apply if this suggestion is accepted at the trailing edge of the query.
  // E.g. when we have typed '+ta' accept the key suggestion 'tag', we'll want to apply '+tag:'
  // to trigger typeahead for the value.
  readonly suffix?: string;
};

export type TextSuggestion = BaseSuggestion & {
  readonly suggestions: TextSuggestionOption[];
  readonly type: "TEXT";
};

export type DateSuggestion = BaseSuggestion & {
  readonly suggestions: DateSuggestionOption[];
  readonly type: "DATE";
};

export type TypeaheadSuggestion = TextSuggestion | DateSuggestion;
export type MappedTypeaheadSuggestion = TypeaheadSuggestion;

type SuggestionTypeMap = {
  TEXT: TextSuggestionOption;
  DATE: DateSuggestionOption;
};

export class TextSuggestionOption {
  public constructor(
    public readonly label: string | undefined,
    public readonly value: string,
    public readonly description?: string,
    public readonly count?: number,
  ) {}
}

export class DateSuggestionOption {
  constructor(
    public readonly label: string,
    public readonly value: string,
  ) {}
}

export type SuggestionType = keyof SuggestionTypeMap;
