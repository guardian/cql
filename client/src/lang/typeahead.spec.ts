import { describe, expect, it } from "bun:test";
import { Typeahead } from "./typeahead";
import { TextSuggestionOption, TypeaheadSuggestion } from "./types";
import { Cql } from "./Cql";
import { TestTypeaheadHelpers } from "./fixtures/TestTypeaheadHelpers";

describe("typeahead", () => {
  const typeaheadQueryClient = new TestTypeaheadHelpers();
  const typeahead = new Typeahead(typeaheadQueryClient.fieldResolvers);
  const cql = new Cql(typeahead);

  const getSuggestions = async (query: string) =>
    await cql.getSuggestions(cql.parse(query).query!);

  it("should give all options for empty queryFields", async () => {
    expect(await getSuggestions("")).toEqual([]);

    expect(await getSuggestions("+")).toEqual([
      new TypeaheadSuggestion(
        0,
        0,
        "chipKey",
        [
          new TextSuggestionOption(
            "Tag",
            "tag",
            "Search by content tags, e.g. sport/football"
          ),
          new TextSuggestionOption(
            "Section",
            "section",
            "Search by content sections, e.g. section/news"
          ),
          new TextSuggestionOption(
            "From date",
            "from-date",
            "The date to search from"
          ),
          new TextSuggestionOption(
            "To date",
            "to-date",
            "The date to search to"
          ),
        ],
        "TEXT",
        ":"
      ),
    ]);
  });

  it("should give typeahead suggestions for query meta keys", async () => {
    const suggestions = await getSuggestions("+ta");
    expect(suggestions).toEqual([
      new TypeaheadSuggestion(
        0,
        2,
        "chipKey",
        [
          new TextSuggestionOption(
            "Tag",
            "tag",
            "Search by content tags, e.g. sport/football"
          ),
        ],
        "TEXT",
        ":"
      ),
    ]);
  });

  it("should give typeahead suggestions for both query meta keys and values", async () => {
    const suggestions = await getSuggestions("+tag:tags-are-magic");

    expect(suggestions).toEqual([
      new TypeaheadSuggestion(
        0,
        3,
        "chipKey",
        [
          new TextSuggestionOption(
            "Tag",
            "tag",
            "Search by content tags, e.g. sport/football"
          ),
        ],
        "TEXT",
        ":"
      ),
      new TypeaheadSuggestion(
        4,
        18,
        "chipValue",
        [
          new TextSuggestionOption(
            "Tags are magic",
            "tags-are-magic",
            "A magic tag"
          ),
        ],
        "TEXT",
        " "
      ),
    ]);
  });

  it("should give value suggestions for an empty string", async () => {
    const suggestions = await getSuggestions("+tag:");
    expect(suggestions).toEqual([
      new TypeaheadSuggestion(
        0,
        3,
        "chipKey",
        [
          new TextSuggestionOption(
            "Tag",
            "tag",
            "Search by content tags, e.g. sport/football"
          ),
        ],
        "TEXT",
        ":"
      ),
      new TypeaheadSuggestion(
        4,
        4,
        "chipValue",
        [
          new TextSuggestionOption(
            "Tags are magic",
            "tags-are-magic",
            "A magic tag"
          ),
        ],
        "TEXT",
        " "
      ),
    ]);
  });

  it("should give a suggestion of type DATE given e.g. 'from-date'", async () => {
    const suggestions = await getSuggestions("+from-date:");

    expect(suggestions).toEqual([
      new TypeaheadSuggestion(
        0,
        9,
        "chipKey",
        [
          new TextSuggestionOption(
            "From date",
            "from-date",
            "The date to search from"
          ),
        ],
        "TEXT",
        ":"
      ),
      new TypeaheadSuggestion(10, 10, "chipValue", [], "TEXT", " "),
    ]);
  });

  it("should give suggestions for multiple tags", async () => {
    const suggestions = await getSuggestions("+tag:a +");

    expect(suggestions).toEqual([
      new TypeaheadSuggestion(
        0,
        3,
        "chipKey",
        [
          new TextSuggestionOption(
            "Tag",
            "tag",
            "Search by content tags, e.g. sport/football"
          ),
        ],
        "TEXT",
        ":"
      ),
      new TypeaheadSuggestion(
        4,
        5,
        "chipValue",
        [
          new TextSuggestionOption(
            "Tags are magic",
            "tags-are-magic",
            "A magic tag"
          ),
        ],
        "TEXT",
        " "
      ),
      new TypeaheadSuggestion(
        7,
        7,
        "chipKey",
        [
          new TextSuggestionOption(
            "Tag",
            "tag",
            "Search by content tags, e.g. sport/football"
          ),
          new TextSuggestionOption(
            "Section",
            "section",
            "Search by content sections, e.g. section/news"
          ),
          new TextSuggestionOption(
            "From date",
            "from-date",
            "The date to search from"
          ),
          new TextSuggestionOption(
            "To date",
            "to-date",
            "The date to search to"
          ),
        ],
        "TEXT",
        ":"
      ),
    ]);
  });
});
