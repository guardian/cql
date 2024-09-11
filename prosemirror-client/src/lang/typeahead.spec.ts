import { describe, expect, it } from "bun:test";
import { createQueryList, createQueryField } from "./ast";
import {
  queryFieldKeyToken,
  queryValueToken,
  quotedStringToken,
} from "./testUtils";
import { Typeahead } from "./typeahead";
import { TestTypeaheadHelpers } from "./typeaheadHelpersTest";
import { TextSuggestionOption, TypeaheadSuggestion } from "./types";

describe("typeahead", () => {
  const typeaheadQueryClient = new TestTypeaheadHelpers();
  const typeahead = new Typeahead(typeaheadQueryClient.fieldResolvers);

  it("should give all options for empty queryFields", async () => {
    expect(await typeahead.getSuggestions(createQueryList([]))).toEqual([]);

    expect(
      await typeahead.getSuggestions(
        createQueryList([
          createQueryField(queryFieldKeyToken("", 0), undefined),
        ])
      )
    ).toEqual([
      new TypeaheadSuggestion(
        0,
        0,
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
    const suggestions = await typeahead.getSuggestions(
      createQueryList([createQueryField(quotedStringToken("ta"), undefined)])
    );
    expect(suggestions).toEqual([
      new TypeaheadSuggestion(
        0,
        3,
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
    const suggestions = await typeahead.getSuggestions(
      createQueryList([
        createQueryField(
          queryFieldKeyToken("tag", 0),
          queryValueToken("tags-are-magic", 5)
        ),
      ])
    );

    expect(suggestions).toEqual([
      new TypeaheadSuggestion(
        0,
        3,
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
        5,
        19,
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
    const suggestions = await typeahead.getSuggestions(
      createQueryList([
        createQueryField(queryFieldKeyToken("tag", 0), queryValueToken("", 4)),
      ])
    );
    expect(suggestions).toEqual([
      new TypeaheadSuggestion(
        0,
        3,
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
    const suggestions = await typeahead.getSuggestions(
      createQueryList([
        createQueryField(
          queryFieldKeyToken("from-date", 0),
          queryValueToken("", 9)
        ),
      ])
    );

    expect(suggestions).toEqual([
      new TypeaheadSuggestion(
        0,
        9,

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
      new TypeaheadSuggestion(9, 9, [], "TEXT", " "),
    ]);
  });
});
