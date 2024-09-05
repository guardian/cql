import { TextSuggestionOption, TypeaheadField } from "./typeahead";

export class TestTypeaheadHelpers {
  public fieldResolvers = [
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
    new TypeaheadField("from-date", "From date", "The date to search from", []),
    new TypeaheadField("to-date", "To date", "The date to search to", []),
  ];

  private getTags(_: string): Promise<TextSuggestionOption[]> {
    return Promise.resolve([
      new TextSuggestionOption(
        "Tags are magic",
        "tags-are-magic",
        "A magic tag"
      ),
    ]);
  }

  private getSections(_: string): Promise<TextSuggestionOption[]> {
    return Promise.resolve([
      new TextSuggestionOption(
        "Also sections",
        "sections-are-magic",
        "Sections are less magic"
      ),
    ]);
  }
}
