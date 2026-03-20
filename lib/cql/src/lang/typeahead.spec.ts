import { describe, expect, it } from "bun:test";
import { Typeahead, TypeaheadField } from "./typeahead";
import {
  DateSuggestionOption,
  TextSuggestionOption,
  TypeaheadSuggestion,
} from "./types";
import {
  testTags,
  TestTypeaheadHelpers,
} from "./fixtures/TestTypeaheadHelpers";
import { createParser } from "./Cql";

describe("typeahead", () => {
  const typeaheadQueryClient = new TestTypeaheadHelpers();
  const typeahead = new Typeahead(typeaheadQueryClient.typeaheadFields);

  const getSuggestions = async (
    query: string,
    position: number,
    _typeahead: Typeahead = typeahead,
  ) => {
    const result = createParser()(query);

    if (!result.queryAst) {
      throw result.error;
    }

    return await _typeahead.getSuggestions(result.queryAst, position);
  };

  it("should give all options for empty queryFields", async () => {
    expect(await getSuggestions("", 0)).toEqual(undefined);

    expect(await getSuggestions("+:", 1)).toEqual({
      from: 1,
      to: 2,
      position: "chipKey",
      suggestions: [
        new TextSuggestionOption(
          "Tag",
          "tag",
          "Search by content tags, e.g. sport/football",
        ),
        new TextSuggestionOption(
          "Sync",
          "sync",
          "Search synchronous list of tags",
        ),
        new TextSuggestionOption(
          "Section",
          "section",
          "Search by content sections, e.g. section/news",
        ),
        new TextSuggestionOption(
          "From date",
          "from-date",
          "The date to search from",
        ),
        new TextSuggestionOption("ID", "id", "The content ID"),
      ],
      type: "TEXT",
      suffix: ":",
    });
  });

  it("should give typeahead suggestions for query meta keys", async () => {
    const suggestions = await getSuggestions("+ta:", 1);
    expect(suggestions).toEqual({
      from: 1,
      to: 4,
      position: "chipKey",
      suggestions: [
        new TextSuggestionOption(
          "Tag",
          "tag",
          "Search by content tags, e.g. sport/football",
        ),
      ],
      type: "TEXT",
      suffix: ":",
    });
  });

  it("should give typeahead suggestions for values", async () => {
    const suggestions = await getSuggestions("+tag:tags-are-magic", 5);

    expect(suggestions).toEqual({
      from: 5,
      to: 19,
      position: "chipValue",
      suggestions: testTags,
      type: "TEXT",
      suffix: " ",
    });
  });

  it("should give typeahead suggestions in a case insensitive way for synchronous query meta keys across value and label", async () => {
    const expectedValue: TypeaheadSuggestion = {
      from: 6,
      to: 9,
      position: "chipValue",
      suggestions: [
        new TextSuggestionOption(
          "abc DEF",
          "GHI jkl",
          "A tag with a mix of upper and lowercase strings",
        ),
      ],
      type: "TEXT",
      suffix: " ",
    };
    const suggestionsUppercaseLabelQuery = await getSuggestions("+sync:ABC", 6);

    expect(suggestionsUppercaseLabelQuery).toEqual(expectedValue);

    const suggestionsLowercaseLabelQuery = await getSuggestions("+sync:def", 6);

    expect(suggestionsLowercaseLabelQuery).toEqual(expectedValue);

    const suggestionsUppercaseValueQuery = await getSuggestions("+sync:JKL", 6);

    expect(suggestionsUppercaseValueQuery).toEqual(expectedValue);

    const suggestionsLowercaseValueQuery = await getSuggestions("+sync:ghi", 6);

    expect(suggestionsLowercaseValueQuery).toEqual(expectedValue);

    const suggestionsForNonMatchingQuery = await getSuggestions("+sync:mno", 6);
    expect(suggestionsLowercaseValueQuery).not.toEqual(
      suggestionsForNonMatchingQuery,
    );
  });

  it("should give value suggestions for an empty string", async () => {
    const suggestions = await getSuggestions("+tag:", 5);
    expect(suggestions).toEqual({
      from: 5,
      to: 5,
      position: "chipValue",
      suggestions: testTags,
      type: "TEXT",
      suffix: " ",
    });
  });

  it("should give a suggestion of type DATE given e.g. 'from-date'", async () => {
    const suggestions = await getSuggestions("+from-date:", 11);

    expect(suggestions).toEqual({
      from: 11,
      to: 11,
      position: "chipValue",
      suggestions: [
        new DateSuggestionOption("1 day ago", "-1d"),
        new DateSuggestionOption("7 days ago", "-7d"),
        new DateSuggestionOption("14 days ago", "-14d"),
        new DateSuggestionOption("30 days ago", "-30d"),
        new DateSuggestionOption("1 year ago", "-1y"),
      ],
      type: "DATE",
      suffix: " ",
    });
  });

  it("should give suggestions for the correct tag where there is more than one", async () => {
    const suggestions = await getSuggestions("+tag:a +:", 8);

    expect(suggestions).toEqual({
      from: 8,
      to: 9,
      position: "chipKey",
      suggestions: [
        new TextSuggestionOption(
          "Tag",
          "tag",
          "Search by content tags, e.g. sport/football",
        ),
        new TextSuggestionOption(
          "Sync",
          "sync",
          "Search synchronous list of tags",
        ),
        new TextSuggestionOption(
          "Section",
          "section",
          "Search by content sections, e.g. section/news",
        ),
        new TextSuggestionOption(
          "From date",
          "from-date",
          "The date to search from",
        ),
        new TextSuggestionOption("ID", "id", "The content ID"),
      ],
      type: "TEXT",
      suffix: ":",
    });
  });

  it("should suggest keys that start with the search string first", async () => {
    const typeahead = new Typeahead(
      ["tag", "gnat", "stage"].map((id) => new TypeaheadField(id, id, id)),
    );

    expect(
      (await getSuggestions("+g:", 1, typeahead))?.suggestions.map(
        (s) => s.value,
      ),
    ).toEqual(["gnat", "tag", "stage"]);
  });
});
