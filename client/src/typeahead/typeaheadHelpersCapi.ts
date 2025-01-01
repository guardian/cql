import type { TagsResponse } from "@guardian/content-api-models/v1/tagsResponse";
import type { SectionsResponse } from "@guardian/content-api-models/v1/sectionsResponse";
import type { SearchResponse } from "@guardian/content-api-models/v1/searchResponse";
import { TypeaheadField } from "../lang/typeahead";
import { TextSuggestionOption } from "../lang/types";
import { stableSort } from "../utils/sort";
import { LRUCache } from "./LRUCache";

export class TypeaheadHelpersCapi {
  private cache = new LRUCache(1000);
  public constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}

  public setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getTags = async (
    str: string,
    signal?: AbortSignal
  ): Promise<TextSuggestionOption[]> => {
    const tags = await this.getJson<{ response: TagsResponse }>(
      "tags",
      { q: str },
      signal
    ).then((body) => body.response.results);

    const eventuallyAggregationCounts = tags.map(async (tag) => {
      const searchResponse = await this.getJson<{ response: SearchResponse }>(
        "search",
        { tag: tag.id },
        signal
      );

      return new TextSuggestionOption(
        tag.webTitle,
        tag.id,
        tag.description,
        searchResponse.response.total
      );
    });

    const aggregationCounts = await Promise.all(eventuallyAggregationCounts);

    return this.sortResultsByCount(aggregationCounts);
  };

  private getSections = async (
    str: string,
    signal?: AbortSignal
  ): Promise<TextSuggestionOption[]> => {
    const sections = await this.getJson<{ response: SectionsResponse }>(
      "sections",
      { q: str },
      signal
    ).then((body) => body.response.results);

    const eventuallyAggregationCounts = sections.map(async (section) => {
      const searchResponse = await this.getJson<{ response: SearchResponse }>(
        "search",
        { section: section.id },
        signal
      );

      return new TextSuggestionOption(
        section.webTitle,
        section.id,
        section.webTitle,
        searchResponse.response.total
      );
    });

    const aggregationCounts = await Promise.all(eventuallyAggregationCounts);

    return this.sortResultsByCount(aggregationCounts);
  };

  private sortResultsByCount = <T extends { count?: number }>(
    results: T[],
    quantiseTo = 1000
  ): T[] => {
    return stableSort(results, (a, b) => {
      const aCount = Math.ceil((a.count ?? 1) / quantiseTo);
      const bCount = Math.ceil((b.count ?? 1) / quantiseTo);

      return bCount - aCount;
    });
  };

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
      "production-office",
      "Production office",
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
      "lang",
      "Language",
      "Return content that has the given ISO language code, e.g. 'en', 'fr'"
    ),
    new TypeaheadField(
      "star-rating",
      "Star rating",
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
    _params: Record<string, string>,
    signal?: AbortSignal
  ): Promise<T> {
    const params = new URLSearchParams({
      ..._params,
      "api-key": this.apiKey,
    });
    const url = `${this.baseUrl}/${path}?${params.toString()}`;
    const maybeCachedResult = this.cache.get(url);
    if (maybeCachedResult) {
      return maybeCachedResult as T;
    }

    const result = (await (
      await fetch(url, { signal })
    ).json()) as T;

    this.cache.put(url, result);
    return result;
  }
}
