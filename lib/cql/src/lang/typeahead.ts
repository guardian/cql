import { ProseMirrorToken } from "../cqlInput/editor/utils";
import { CqlQuery } from "./ast";
import {
  DateSuggestionOption,
  TextSuggestionOption,
  TypeaheadSuggestion,
  SuggestionType,
} from "./types";
import { getAstNodeAtPos } from "./utils";

type TypeaheadResolver =
  | ((str: string, signal?: AbortSignal) => Promise<TextSuggestionOption[]>)
  | TextSuggestionOption[];

const compareValueAndLabel =
  (compare: string, f: (optionStr: string, compareStr: string) => boolean) =>
  (option: TextSuggestionOption) =>
    f(option.value.toLowerCase(), compare) ||
    f(option.label?.toLowerCase() || "", compare);

const filterAndSortTextSuggestionOption = (
  suggestions: TextSuggestionOption[],
  str: string,
) => {
  const lowerCaseStr = str.toLowerCase();
  return suggestions
    .filter(
      compareValueAndLabel(lowerCaseStr, (str, compare) =>
        str.includes(compare),
      ),
    )
    .sort((a, b) => {
      const aStartsWith = compareValueAndLabel(lowerCaseStr, (str, compare) =>
        str.startsWith(compare),
      )(a);
      const bStartsWith = compareValueAndLabel(lowerCaseStr, (str, compare) =>
        str.startsWith(compare),
      )(b);
      if (aStartsWith === bStartsWith) {
        return 0;
      } else {
        return aStartsWith ? -1 : 1;
      }
    });
};

export class TypeaheadField {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    private resolver?: TypeaheadResolver,
    public suggestionType: SuggestionType = "TEXT",
  ) {}

  public resolveSuggestions(
    str: string,
    signal?: AbortSignal,
  ): Promise<TextSuggestionOption[]> | undefined {
    if (Array.isArray(this.resolver)) {
      return Promise.resolve(
        filterAndSortTextSuggestionOption(this.resolver, str),
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
      field.toSuggestionOption(),
    );
  }

  public async getSuggestions(
    program: CqlQuery,
    position: number,
    signal?: AbortSignal,
  ): Promise<TypeaheadSuggestion | undefined> {
    return new Promise((resolve, reject) => {
      // Abort existing fetch, if it exists
      this.abortController?.abort();

      if (!program.content) {
        return resolve(undefined);
      }

      const abortController = new AbortController();
      this.abortController = abortController;
      abortController.signal.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });

      const maybeSuggestionAtPos = getAstNodeAtPos(program.content, position);

      if (!maybeSuggestionAtPos) {
        return resolve(undefined);
      }

      const { key, value } = maybeSuggestionAtPos;

      resolve(this.suggestCqlField(key, value, signal));
    });
  }

  private getSuggestionsForKeyToken(
    keyToken: ProseMirrorToken,
  ): TypeaheadSuggestion | undefined {
    const suggestions = this.suggestFieldKey(keyToken.literal ?? "");

    if (!suggestions) {
      return undefined;
    }

    return {
      from: keyToken.from,
      to: Math.max(keyToken.to, keyToken.to - 1), // Do not include ':'
      position: "chipKey",
      suggestions,
      type: "TEXT",
      suffix: ":",
    };
  }

  private async suggestCqlField(
    key: ProseMirrorToken,
    value?: ProseMirrorToken,
    signal?: AbortSignal,
  ): Promise<TypeaheadSuggestion | undefined> {
    if (!value) {
      return this.getSuggestionsForKeyToken(key);
    }

    const maybeValueSuggestions = this.suggestFieldValue(
      key.literal ?? "",
      value?.literal ?? "",
      signal,
    );

    if (!maybeValueSuggestions) {
      return;
    }

    const suggestions = await maybeValueSuggestions.suggestions;

    return {
      from: value ? value.from : key.from, // Extend backwards into chipKey's ':'
      to: value ? value.to : key.to,
      position: "chipValue",
      suggestions,
      type: maybeValueSuggestions.type,
      suffix: " ",
    } as TypeaheadSuggestion;
  }

  private suggestFieldKey(str: string): TextSuggestionOption[] | undefined {
    if (str === "") {
      return this.typeaheadFieldEntries;
    }

    const suggestions = filterAndSortTextSuggestionOption(
      this.typeaheadFieldEntries,
      str,
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
    signal?: AbortSignal,
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
