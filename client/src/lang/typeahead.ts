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
    private resolver?: TypeaheadResolver,
    public suggestionType: SuggestionType = "TEXT"
  ) {}

  public resolveSuggestions(
    str: string,
    signal?: AbortSignal
  ): Promise<TextSuggestionOption[]> | undefined {
    if (Array.isArray(this.resolver)) {
      return Promise.resolve(
        this.resolver.filter((item) => item.label.includes(str))
      );
    }

    return this.resolver?.(str, signal);
  }

  public toSuggestionOption(): TextSuggestionOption {
    return new TextSuggestionOption(this.name, this.id, this.description);
  }
}

export class Typeahead {
  private typeaheadFieldEntries: TextSuggestionOption[];
  private abortController: AbortController | undefined;

  constructor(private typeaheadFields: TypeaheadField[]) {
    this.typeaheadFieldEntries = this.typeaheadFields.map((field) =>
      field.toSuggestionOption()
    );
  }

  public getSuggestions(
    program: CqlQuery,
    signal?: AbortSignal
  ): Promise<TypeaheadSuggestion[]> {
    return new Promise((resolve, reject) => {
      // Abort existing fetch, if it exists
      this.abortController?.abort();

      if (!program.content) {
        return resolve([]);
      }

      const abortController = new AbortController();
      this.abortController = abortController;
      abortController.signal.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });

      const eventuallySuggestions = getCqlFieldsFromCqlBinary(
        program.content
      ).flatMap((queryField) => this.suggestCqlField(queryField, signal));

      return Promise.all(eventuallySuggestions)
        .then(suggestions => resolve(suggestions.flat()))
        .catch(reject);
    });
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
    const resolver = this.typeaheadFields.find((_) => _.id == key);

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
    }

    const suggestions = resolver.resolveSuggestions(str, signal);
    if (suggestions) {
      return {
        type: "TEXT",
        suggestions,
      };
    }
  }
}
