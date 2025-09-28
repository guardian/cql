import { TypeaheadField } from "../typeahead";
import { TextSuggestionOption } from "../types";

export const testTags = [
  new TextSuggestionOption("Tags are magic", "tags-are-magic", "A magic tag"),
  new TextSuggestionOption(
    "Tag with a space in it",
    "Tag with space",
    "A tag with whitespace in the id. Gosh",
  ),
  new TextSuggestionOption(
    "abc DEF",
    "GHI jkl",
    "A tag with a mix of upper and lowercase strings",
  ),
];

export class TestTypeaheadHelpers {
  public typeaheadFields = [
    new TypeaheadField(
      "tag",
      "Tag",
      "Search by content tags, e.g. sport/football",
      this.getAsyncTags,
    ),
    new TypeaheadField(
      "sync",
      "Sync",
      "Search synchronous list of tags",
      testTags,
    ),
    new TypeaheadField(
      "section",
      "Section",
      "Search by content sections, e.g. section/news",
      this.getSections,
    ),
    new TypeaheadField(
      "from-date",
      "From date",
      "The date to search from",
      undefined,
      "DATE",
    ),
    new TypeaheadField("s", "Short field", "A short field"),
  ];

  private getAsyncTags(): Promise<TextSuggestionOption[]> {
    return Promise.resolve(testTags);
  }

  private getSections(): Promise<TextSuggestionOption[]> {
    return Promise.resolve([
      new TextSuggestionOption(
        "Also sections",
        "sections-are-magic",
        "Sections are less magic",
      ),
    ]);
  }
}
