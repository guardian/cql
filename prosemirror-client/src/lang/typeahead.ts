import { QueryArray, QueryField } from "./ast";
import { Token } from "./token";

export class TypeaheadSuggestion {
  constructor(
    public from: number,
    public to: number,
    public suggestions: Suggestion[],
    // The suffix to apply if this suggestion is accepted at the trailing edge of the query.
    // E.g. when we have typed '+ta' accept the key suggestion 'tag', we'll want to apply '+tag:'
    // to trigger typeahead for the value.
    public suffix?: string
  ) {}
}

type Suggestion = TextSuggestionOption | DateSuggestion;

export class TextSuggestionOption {
  public constructor(
    public label: string,
    public value: string,
    public description?: string
  ) {}
}

export class DateSuggestion {
  constructor(public validFrom?: string, public validTo?: string) {}
}

export type TypeaheadResolver =
  | ((str: string) => Promise<TextSuggestionOption[]>)
  | TextSuggestionOption[];

type TypeaheadType = "TEXT" | "DATE";

export class TypeaheadField {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    private resolver: TypeaheadResolver = [],
    public suggestionType: TypeaheadType = "TEXT"
  ) {}

  public resolveSuggestions(str: string): Promise<TextSuggestionOption[]> {
    if (Array.isArray(this.resolver)) {
      return Promise.resolve(
        this.resolver.filter((item) => item.label.includes(str))
      );
    }

    return this.resolver(str);
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

  public getSuggestions(program: QueryArray): Promise<TypeaheadSuggestion[]> {
    const suggestions = program.content
      .map((expr) => {
        switch (expr.type) {
          case "QueryField": {
            return this.suggestQueryField(expr);
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
    if (!keyToken.literal) {
      return [];
    }

    const suggestions = this.suggestFieldKey(keyToken.literal);

    if (!suggestions) {
      return [];
    }

    return [
      new TypeaheadSuggestion(keyToken.start, keyToken.end, suggestions, ":"),
    ];
  }

  private async suggestQueryField(
    q: QueryField
  ): Promise<TypeaheadSuggestion[]> {
    const { key, value } = q;

    if (!value) {
      return this.getSuggestionsForKeyToken(key);
    }

    const keySuggestions = this.getSuggestionsForKeyToken(key);
    const valueSuggestions = this.suggestFieldValue(
      key.literal ?? "",
      value.literal ?? ""
    ).then(
      (suggestions) =>
        new TypeaheadSuggestion(value.start, value.end, suggestions, " ")
    );

    return Promise.all([keySuggestions, valueSuggestions]).then((_) =>
      _.flat()
    );
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

  private suggestFieldValue(key: string, str: string): Promise<Suggestion[]> {
    const resolver = this.fieldResolvers.find((_) => _.id == key);

    if (!resolver) {
      return Promise.resolve([]);
    }

    if (resolver.suggestionType === "DATE") {
      return Promise.resolve([new DateSuggestion()]);
    } else {
      return resolver.resolveSuggestions(str);
    }
  }
}
