import { QueryList, QueryField } from "./ast";
import { Token } from "./token";
import {
  DateSuggestion,
  Suggestion,
  TextSuggestionOption,
  TypeaheadSuggestion,
  TypeaheadType,
} from "./types";

export type TypeaheadResolver =
  | ((str: string, signal?: AbortSignal) => Promise<TextSuggestionOption[]>)
  | TextSuggestionOption[];

export class TypeaheadField {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    private resolver: TypeaheadResolver = [],
    public suggestionType: TypeaheadType = "TEXT"
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

  public getSuggestions(
    program: QueryList,
    signal?: AbortSignal
  ): Promise<TypeaheadSuggestion[]> {
    const suggestions = program.content
      .map((expr) => {
        switch (expr.type) {
          case "QueryField": {
            return this.suggestQueryField(expr, signal);
          }
          default: {
            return Promise.resolve([]);
          }
        }
      })
      .flat();

    return Promise.all(suggestions).then((suggestions) => suggestions.flat());
  }

  private getSuggestionsForKeyToken(keyToken: Token): TypeaheadSuggestion[] {
    const suggestions = this.suggestFieldKey(keyToken.literal ?? "");

    if (!suggestions) {
      return [];
    }

    return [
      new TypeaheadSuggestion(
        keyToken.start,
        keyToken.end,
        suggestions,
        "TEXT",
        ":"
      ),
    ];
  }

  private async suggestQueryField(
    q: QueryField,
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

    const [suggestionType, eventuallySuggestions] = maybeValueSuggestions;

    return eventuallySuggestions.then((suggestions) => [
      ...keySuggestions,
      new TypeaheadSuggestion(
        value.start,
        value.end,
        suggestions,
        suggestionType,
        " "
      ),
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
  ): [TypeaheadType, Promise<Suggestion[]>] | undefined {
    const resolver = this.fieldResolvers.find((_) => _.id == key);

    if (!resolver) {
      return undefined;
    }

    if (resolver.suggestionType === "DATE") {
      return ["DATE", Promise.resolve([new DateSuggestion()])];
    } else {
      return ["TEXT", resolver.resolveSuggestions(str, signal)];
    }
  }
}