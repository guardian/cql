import { CqlQuery, CqlField } from "./ast";
import { Token } from "./token";
import {
  DateSuggestionOption,
  TextSuggestionOption,
  TypeaheadSuggestion,
  SuggestionType,
} from "./types";
import { getCqlFieldsFromCqlBinary } from "./utils";

export type TypeaheadResolver =
  | ((str: string, signal?: AbortSignal) => Promise<TextSuggestionOption[]>)
  | TextSuggestionOption[];

export class TypeaheadField {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    private resolver: TypeaheadResolver = [],
    public suggestionType: SuggestionType = "TEXT"
  ) {}

  public resolveSuggestions(
    str: string,
    signal?: AbortSignal
  ): Promise<TextSuggestionOption[]> {
    if (Array.isArray(this.resolver)) {
      return Promise.resolve(
        this.resolver.filter((item) => item.label.includes(str))
      );
    }

    return this.resolver(str, signal);
  }

  public toSuggestionOption(): TextSuggestionOption {
    return new TextSuggestionOption(this.name, this.id, this.description);
  }
}

export class Typeahead {
  private typeaheadFieldEntries: TextSuggestionOption[];

  constructor(private fieldResolvers: TypeaheadField[]) {
    this.typeaheadFieldEntries = this.fieldResolvers.map((field) =>
      field.toSuggestionOption()
    );
  }

  public async getSuggestions(
    program: CqlQuery,
    signal?: AbortSignal
  ): Promise<TypeaheadSuggestion[]> {
    if (!program.content) {
      return [];
    }

    const eventuallySuggestions = getCqlFieldsFromCqlBinary(
      program.content
    ).flatMap((queryField) => this.suggestCqlField(queryField, signal));

    const suggestions = await Promise.all(eventuallySuggestions);

    return suggestions.flat();
  }

  private getSuggestionsForKeyToken(keyToken: Token): TypeaheadSuggestion[] {
    const suggestions = this.suggestFieldKey(keyToken.literal ?? "");

    if (!suggestions) {
      return [];
    }

    return [
      {
        from: keyToken.start,
        to: keyToken.end,
        position: "chipKey",
        suggestions,
        type: "TEXT",
        suffix: ":",
      },
    ];
  }

  private async suggestCqlField(
    q: CqlField,
    signal?: AbortSignal
  ): Promise<TypeaheadSuggestion[]> {
    const { key, value } = q;

    if (!value) {
      return this.getSuggestionsForKeyToken(key);
    }

    const keySuggestions = this.getSuggestionsForKeyToken(key);
    const maybeValueSuggestions = this.suggestFieldValue(
      key.literal ?? "",
      value.literal ?? "",
      signal
    );

    if (!maybeValueSuggestions) {
      return Promise.resolve(keySuggestions);
    }

    return maybeValueSuggestions.suggestions.then((suggestions) => [
      ...keySuggestions,
      {
        from: value.start,
        to: value.end,
        position: "chipValue",
        suggestions,
        type: maybeValueSuggestions.type,
        suffix: " ",
      } as TypeaheadSuggestion,
    ]);
  }

  private suggestFieldKey(str: string): TextSuggestionOption[] | undefined {
    if (str === "") {
      return this.typeaheadFieldEntries;
    }

    const suggestions = this.typeaheadFieldEntries.filter((_) =>
      _.value.includes(str.toLowerCase())
    );

    if (suggestions.length) {
      return suggestions;
    } else {
      return undefined;
    }
  }

  private suggestFieldValue(
    key: string,
    str: string,
    signal?: AbortSignal
  ):
    | { type: "TEXT"; suggestions: Promise<TextSuggestionOption[]> }
    | { type: "DATE"; suggestions: Promise<DateSuggestionOption[]> }
    | undefined {
    const resolver = this.fieldResolvers.find((_) => _.id == key);

    if (!resolver) {
      return undefined;
    }

    if (resolver.suggestionType === "DATE") {
      return {
        type: "DATE",
        suggestions: Promise.resolve([
          new DateSuggestionOption("1 day ago", "-1d"),
          new DateSuggestionOption("7 days ago", "-7d"),
          new DateSuggestionOption("14 days ago", "-14d"),
          new DateSuggestionOption("30 days ago", "-30d"),
          new DateSuggestionOption("1 year ago", "-1y"),
        ]),
      };
    } else {
      return {
        type: "TEXT",
        suggestions: resolver.resolveSuggestions(str, signal),
      };
    }
  }
}
