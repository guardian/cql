import { TypeaheadField } from "../typeahead";
import { TextSuggestionOption } from "../types";

export class TestTypeaheadHelpers {
  public typeaheadFields = [
    new TypeaheadField(
      "tag",
      "Tag",
      "Search by content tags, e.g. sport/football",
      this.getTags
    ),
    new TypeaheadField(
      "section",
      "Section",
      "Search by content sections, e.g. section/news",
      this.getSections
    ),
    new TypeaheadField(
      "from-date",
      "From date",
      "The date to search from",
      undefined,
      "DATE"
    ),
  ];

  private getTags(): Promise<TextSuggestionOption[]> {
    return Promise.resolve([
      new TextSuggestionOption(
        "Tags are magic",
        "tags-are-magic",
        "A magic tag"
      ),
    ]);
  }

  private getSections(): Promise<TextSuggestionOption[]> {
    return Promise.resolve([
      new TextSuggestionOption(
        "Also sections",
        "sections-are-magic",
        "Sections are less magic"
      ),
    ]);
  }
}
