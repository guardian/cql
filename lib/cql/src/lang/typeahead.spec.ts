import { describe, expect, it } from "bun:test";
import { Typeahead } from "./typeahead";
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

  const getSuggestions = async (query: string) =>
    await typeahead.getSuggestions(createParser()(query).queryAst!);

  it("should give all options for empty queryFields", async () => {
    expect(await getSuggestions("")).toEqual([]);

    expect(await getSuggestions("+")).toEqual([
      {
        from: 0,
        to: 0,
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
        ],
        type: "TEXT",
        suffix: ":",
      },
    ]);
  });

  it("should give typeahead suggestions for query meta keys", async () => {
    const suggestions = await getSuggestions("+ta");
    expect(suggestions).toEqual([
      {
        from: 0,
        to: 2,
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
      },
    ]);
  });

  it("should give typeahead suggestions for both query meta keys and values", async () => {
    const suggestions = await getSuggestions("+tag:tags-are-magic");

    expect(suggestions).toEqual([
      {
        from: 0,
        to: 3,
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
      },
      {
        from: 4,
        to: 18,
        position: "chipValue",
        suggestions: testTags,
        type: "TEXT",
        suffix: " ",
      },
    ]);
  });

  it("should give typeahead suggestions in a case insensitive way for synchronous query meta keys across value and label", async () => {
    const expectedSuggestions: TypeaheadSuggestion[] = [
      {
        from: 0,
        position: "chipKey",
        suffix: ":",
        suggestions: [
          new TextSuggestionOption(
            "Sync",
            "sync",
            "Search synchronous list of tags",
          ),
        ],
        to: 4,
        type: "TEXT",
      },
      {
        from: 5,
        to: 8,
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
      },
    ];

    const suggestionsUppercaseLabelQuery = await getSuggestions("+sync:ABC");

    expect(suggestionsUppercaseLabelQuery).toEqual(expectedSuggestions);

    const suggestionsLowercaseLabelQuery = await getSuggestions("+sync:def");

    expect(suggestionsLowercaseLabelQuery).toEqual(expectedSuggestions);

    const suggestionsUppercaseValueQuery = await getSuggestions("+sync:JKL");

    expect(suggestionsUppercaseValueQuery).toEqual(expectedSuggestions);

    const suggestionsLowercaseValueQuery = await getSuggestions("+sync:ghi");

    expect(suggestionsLowercaseValueQuery).toEqual(expectedSuggestions);

    const suggestionsForNonMatchingQuery = await getSuggestions("+sync:mno");
    expect(suggestionsLowercaseValueQuery).not.toEqual(
      suggestionsForNonMatchingQuery,
    );
  });

  it("should give value suggestions for an empty string", async () => {
    const suggestions = await getSuggestions("+tag:");
    expect(suggestions).toEqual([
      {
        from: 0,
        to: 3,
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
      },
      {
        from: 4,
        to: 4,
        position: "chipValue",
        suggestions: testTags,
        type: "TEXT",
        suffix: " ",
      },
    ]);
  });

  it("should give a suggestion of type DATE given e.g. 'from-date'", async () => {
    const suggestions = await getSuggestions("+from-date:");

    expect(suggestions).toEqual([
      {
        from: 0,
        to: 9,
        position: "chipKey",
        suggestions: [
          new TextSuggestionOption(
            "From date",
            "from-date",
            "The date to search from",
          ),
        ],
        type: "TEXT",
        suffix: ":",
      },
      {
        from: 10,
        to: 10,
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
      },
    ]);
  });

  it("should give suggestions for multiple tags", async () => {
    const suggestions = await getSuggestions("+tag:a +");

    expect(suggestions).toEqual([
      {
        from: 0,
        to: 3,
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
      },
      {
        from: 4,
        to: 5,
        position: "chipValue",
        suggestions: testTags,
        type: "TEXT",
        suffix: " ",
      },
      {
        from: 7,
        to: 7,
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
        ],
        type: "TEXT",
        suffix: ":",
      },
    ]);
  });
});
