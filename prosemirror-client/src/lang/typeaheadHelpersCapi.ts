import type { TagsResponse } from "@guardian/content-api-models/v1/tagsResponse";
import type { SectionsResponse } from "@guardian/content-api-models/v1/sectionsResponse";
import { TypeaheadField } from "./typeahead";
import { TextSuggestionOption } from "./types";

export class TypeaheadHelpersCapi {
  public constructor(private baseUrl: string, private apiKey: string) {}

  private getTags = (
    str: string,
    signal: AbortSignal
  ): Promise<TextSuggestionOption[]> =>
    this.getJson<{ response: TagsResponse }>("tags", str, signal).then((body) =>
      body.response.results.map(
        (tag) => new TextSuggestionOption(tag.webTitle, tag.id, tag.description)
      )
    );

  private getSections = (
    str: string,
    signal: AbortSignal
  ): Promise<TextSuggestionOption[]> =>
    this.getJson<{ response: SectionsResponse }>("tags", str, signal).then(
      (body) =>
        body.response.results.map(
          (section) =>
            new TextSuggestionOption(
              section.webTitle,
              section.id,
              section.webTitle
            )
        )
    );

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
    new TypeaheadField(
      "from-date",
      "From date",
      "The date to search from",
      undefined,
      "DATE"
    ),
    new TypeaheadField(
      "to-date",
      "To date",
      "The date to search to",
      undefined,
      "DATE"
    ),
    new TypeaheadField(
      "format",
      "Format",
      "The format to return the results in",
      [
        new TextSuggestionOption("JSON", "json", "JSON format"),
        new TextSuggestionOption("XML", "xml", "XML format"),
      ]
    ),
    new TypeaheadField(
      "query-fields",
      "Query fields",
      "Specify in which indexed fields query terms should be searched on, e.g. 'body', 'body, thumbnail'"
    ),
    new TypeaheadField(
      "reference",
      "Reference",
      "Return only content with those references, e.g. 'isbn/9780718178949'"
    ),
    new TypeaheadField(
      "reference-type",
      "Reference type",
      "Return only content with references of those types, e.g. 'isbn'"
    ),
    new TypeaheadField(
      "rights",
      "Rights",
      "Return only content with those rights",
      [
        new TextSuggestionOption(
          "Syndicatable",
          "syndicatable",
          "Content that can be syndicated"
        ),
        new TextSuggestionOption(
          "Subscription databases",
          "syndicatable",
          "Content that is available to developer-tier keys"
        ),
      ]
    ),
    new TypeaheadField(
      "ids",
      "IDs",
      "Return only content with those IDs, e.g. technology/2014/feb/17/flappy-bird-clones-apple-google"
    ),
    new TypeaheadField(
      "Production office",
      "production-office",
      "Return only content from those production offices, e.g. 'aus', 'uk,aus'",
      [
        new TextSuggestionOption("UK", "uk", "The UK production office"),
        new TextSuggestionOption(
          "Australia",
          "aus",
          "The Australia production office"
        ),
        new TextSuggestionOption("US", "us", "The US production office"),
      ]
    ),
    new TypeaheadField(
      "Language",
      "lang",
      "Return content that has the given ISO language code, e.g. 'en', 'fr'"
    ),
    new TypeaheadField(
      "Star rating",
      "star-rating",
      "Return only content with a given star rating",
      [
        new TextSuggestionOption("1", "1"),
        new TextSuggestionOption("2", "2"),
        new TextSuggestionOption("3", "3"),
        new TextSuggestionOption("4", "4"),
        new TextSuggestionOption("5", "5"),
      ]
    ),
    new TypeaheadField(
      "show-fields",
      "Show fields",
      "Determine the list of fields to return",
      [
        new TextSuggestionOption("all", "all", "Description"),
        new TextSuggestionOption("trailText", "trailText", "Description"),
        new TextSuggestionOption("headline", "headline", "Description"),
        new TextSuggestionOption(
          "showInRelatedContent",
          "showInRelatedContent",
          "Description"
        ),
        new TextSuggestionOption("body", "body", "Description"),
        new TextSuggestionOption("lastModified", "lastModified", "Description"),
        new TextSuggestionOption(
          "hasStoryPackage",
          "hasStoryPackage",
          "Description"
        ),
        new TextSuggestionOption("score", "score", "Description"),
        new TextSuggestionOption("standfirst", "standfirst", "Description"),
        new TextSuggestionOption("shortUrl", "shortUrl", "Description"),
        new TextSuggestionOption("thumbnail", "thumbnail", "Description"),
        new TextSuggestionOption("wordcount", "wordcount", "Description"),
        new TextSuggestionOption("commentable", "commentable", "Description"),
        new TextSuggestionOption(
          "isPremoderated",
          "isPremoderated",
          "Description"
        ),
        new TextSuggestionOption("allowUgc", "allowUgc", "Description"),
        new TextSuggestionOption("byline", "byline", "Description"),
        new TextSuggestionOption("publication", "publication", "Description"),
        new TextSuggestionOption(
          "internalPageCode",
          "internalPageCode",
          "Description"
        ),
        new TextSuggestionOption(
          "productionOffice",
          "productionOffice",
          "Description"
        ),
        new TextSuggestionOption(
          "shouldHideAdverts",
          "shouldHideAdverts",
          "Description"
        ),
        new TextSuggestionOption(
          "liveBloggingNow",
          "liveBloggingNow",
          "Description"
        ),
        new TextSuggestionOption(
          "commentCloseDate",
          "commentCloseDate",
          "Description"
        ),
        new TextSuggestionOption("starRating", "starRating", "Description"),
      ]
    ),
  ];

  private async getJson<T>(
    path: string,
    query: string,
    signal: AbortSignal
  ): Promise<T> {
    const params = new URLSearchParams({
      q: query,
      "api-key": this.apiKey,
    });
    return (await (
      await fetch(`${this.baseUrl}/${path}?${params.toString()}`, { signal })
    ).json()) as T;
  }
}
