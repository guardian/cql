import type { TagsResponse } from "@guardian/content-api-models/v1/tagsResponse";
import type { SectionsResponse } from "@guardian/content-api-models/v1/sectionsResponse";
import type { SearchResponse } from "@guardian/content-api-models/v1/searchResponse";
import { TypeaheadField } from "../lang/typeahead";
import { TextSuggestionOption } from "../lang/types";
import { stableSort } from "../utils/sort";
import { LRUCache } from "./LRUCache";

export class CapiTypeaheadProvider {
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
    const tags = str.length
      ? await this.getJson<{ response: TagsResponse }>(
          "tags",
          { q: str },
          signal
        ).then((body) => body.response.results)
      : this.mostUsedTags;

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

  private mostUsedTags = [
    {
      id: "football/football",
      type: "keyword",
      sectionId: "football",
      sectionName: "Football",
      webTitle: "Football",
      webUrl: "https://www.theguardian.com/football/football",
      apiUrl: "https://content.guardianapis.com/football/football",
      internalName: "Football",
    },
    {
      id: "tone/features",
      type: "tone",
      webTitle: "Features",
      webUrl: "https://www.theguardian.com/tone/features",
      apiUrl: "https://content.guardianapis.com/tone/features",
      internalName: "Feature (Tone)",
    },
    {
      id: "business/business",
      type: "keyword",
      sectionId: "business",
      sectionName: "Business",
      webTitle: "Business",
      webUrl: "https://www.theguardian.com/business/business",
      apiUrl: "https://content.guardianapis.com/business/business",
      internalName: "Business",
    },
    {
      id: "tone/comment",
      type: "tone",
      webTitle: "Comment",
      webUrl: "https://www.theguardian.com/tone/comment",
      apiUrl: "https://content.guardianapis.com/tone/comment",
      internalName: "Comment (Tone)",
    },
    {
      id: "tone/blog",
      type: "tone",
      webTitle: "Blogposts",
      webUrl: "https://www.theguardian.com/tone/blog",
      apiUrl: "https://content.guardianapis.com/tone/blog",
      internalName: "DO NOT USE Blogpost (Tone)",
    },
    {
      id: "politics/politics",
      type: "keyword",
      sectionId: "politics",
      sectionName: "Politics",
      webTitle: "Politics",
      webUrl: "https://www.theguardian.com/politics/politics",
      apiUrl: "https://content.guardianapis.com/politics/politics",
      description: "<p><br></p>",
      internalName: "Politics (UK)",
    },
    {
      id: "theguardian/mainsection",
      type: "newspaper-book",
      sectionId: "news",
      sectionName: "News",
      webTitle: "Main section",
      webUrl: "https://www.theguardian.com/theguardian/mainsection",
      apiUrl: "https://content.guardianapis.com/theguardian/mainsection",
      internalName: "Gdn: Main section G1 (nb)",
    },
    {
      id: "sport/sport",
      type: "keyword",
      sectionId: "sport",
      sectionName: "Sport",
      webTitle: "Sport",
      webUrl: "https://www.theguardian.com/sport/sport",
      apiUrl: "https://content.guardianapis.com/sport/sport",
      internalName: "Sport",
    },
    {
      id: "culture/culture",
      type: "keyword",
      sectionId: "culture",
      sectionName: "Culture",
      webTitle: "Culture",
      webUrl: "https://www.theguardian.com/culture/culture",
      apiUrl: "https://content.guardianapis.com/culture/culture",
      internalName: "Culture",
    },
    {
      id: "world/world",
      type: "keyword",
      sectionId: "world",
      sectionName: "World news",
      webTitle: "World news",
      webUrl: "https://www.theguardian.com/world/world",
      apiUrl: "https://content.guardianapis.com/world/world",
      internalName: "World news",
    },
    {
      id: "uk/uk",
      type: "keyword",
      sectionId: "uk-news",
      sectionName: "UK news",
      webTitle: "UK news",
      webUrl: "https://www.theguardian.com/uk/uk",
      apiUrl: "https://content.guardianapis.com/uk/uk",
      internalName: "UK news",
    },
    {
      id: "tone/news",
      type: "tone",
      webTitle: "News",
      webUrl: "https://www.theguardian.com/tone/news",
      apiUrl: "https://content.guardianapis.com/tone/news",
      internalName: "News (Tone)",
    },
    {
      id: "publication/theguardian",
      type: "publication",
      sectionId: "theguardian",
      sectionName: "From the Guardian",
      webTitle: "The Guardian",
      webUrl: "https://www.theguardian.com/theguardian/all",
      apiUrl: "https://content.guardianapis.com/publication/theguardian",
      description: "All the latest from the world's leading liberal voice.",
      internalName: "The Guardian publication",
    },
    {
      id: "type/article",
      type: "type",
      webTitle: "Article",
      webUrl: "https://www.theguardian.com/articles",
      apiUrl: "https://content.guardianapis.com/type/article",
      internalName: "Article (Content type)",
    },
  ];

  mostUsedSections = [
    {
      id: "news",
      webTitle: "News",
      webUrl: "https://www.theguardian.com/news",
      apiUrl: "https://content.guardianapis.com/news",
      editions: [
        {
          id: "news",
          webTitle: "News",
          webUrl: "https://www.theguardian.com/news",
          apiUrl: "https://content.guardianapis.com/news",
          code: "default",
        },
      ],
    },
    {
      id: "artanddesign",
      webTitle: "Art and design",
      webUrl: "https://www.theguardian.com/artanddesign",
      apiUrl: "https://content.guardianapis.com/artanddesign",
      editions: [
        {
          id: "artanddesign",
          webTitle: "Art and design",
          webUrl: "https://www.theguardian.com/artanddesign",
          apiUrl: "https://content.guardianapis.com/artanddesign",
          code: "default",
        },
      ],
    },
    {
      id: "tv-and-radio",
      webTitle: "Television & radio",
      webUrl: "https://www.theguardian.com/tv-and-radio",
      apiUrl: "https://content.guardianapis.com/tv-and-radio",
      editions: [
        {
          id: "tv-and-radio",
          webTitle: "Television & radio",
          webUrl: "https://www.theguardian.com/tv-and-radio",
          apiUrl: "https://content.guardianapis.com/tv-and-radio",
          code: "default",
        },
      ],
    },
    {
      id: "culture",
      webTitle: "Culture",
      webUrl: "https://www.theguardian.com/culture",
      apiUrl: "https://content.guardianapis.com/culture",
      editions: [
        {
          id: "culture",
          webTitle: "Culture",
          webUrl: "https://www.theguardian.com/culture",
          apiUrl: "https://content.guardianapis.com/culture",
          code: "default",
        },
        {
          id: "au/culture",
          webTitle: "Culture",
          webUrl: "https://www.theguardian.com/au/culture",
          apiUrl: "https://content.guardianapis.com/au/culture",
          code: "au",
        },
        {
          id: "uk/culture",
          webTitle: "Culture",
          webUrl: "https://www.theguardian.com/uk/culture",
          apiUrl: "https://content.guardianapis.com/uk/culture",
          code: "uk",
        },
        {
          id: "us/culture",
          webTitle: "Culture",
          webUrl: "https://www.theguardian.com/us/culture",
          apiUrl: "https://content.guardianapis.com/us/culture",
          code: "us",
        },
      ],
    },
    {
      id: "travel",
      webTitle: "Travel",
      webUrl: "https://www.theguardian.com/travel",
      apiUrl: "https://content.guardianapis.com/travel",
      editions: [
        {
          id: "travel",
          webTitle: "Travel",
          webUrl: "https://www.theguardian.com/travel",
          apiUrl: "https://content.guardianapis.com/travel",
          code: "default",
        },
        {
          id: "au/travel",
          webTitle: "Travel",
          webUrl: "https://www.theguardian.com/au/travel",
          apiUrl: "https://content.guardianapis.com/au/travel",
          code: "au",
        },
        {
          id: "uk/travel",
          webTitle: "Travel",
          webUrl: "https://www.theguardian.com/uk/travel",
          apiUrl: "https://content.guardianapis.com/uk/travel",
          code: "uk",
        },
        {
          id: "us/travel",
          webTitle: "Travel",
          webUrl: "https://www.theguardian.com/us/travel",
          apiUrl: "https://content.guardianapis.com/us/travel",
          code: "us",
        },
      ],
    },
    {
      id: "stage",
      webTitle: "Stage",
      webUrl: "https://www.theguardian.com/stage",
      apiUrl: "https://content.guardianapis.com/stage",
      editions: [
        {
          id: "stage",
          webTitle: "Stage",
          webUrl: "https://www.theguardian.com/stage",
          apiUrl: "https://content.guardianapis.com/stage",
          code: "default",
        },
      ],
    },
    {
      id: "environment",
      webTitle: "Environment",
      webUrl: "https://www.theguardian.com/environment",
      apiUrl: "https://content.guardianapis.com/environment",
      editions: [
        {
          id: "environment",
          webTitle: "Environment",
          webUrl: "https://www.theguardian.com/environment",
          apiUrl: "https://content.guardianapis.com/environment",
          code: "default",
        },
        {
          id: "au/environment",
          webTitle: "Environment",
          webUrl: "https://www.theguardian.com/au/environment",
          apiUrl: "https://content.guardianapis.com/au/environment",
          code: "au",
        },
        {
          id: "uk/environment",
          webTitle: "Environment",
          webUrl: "https://www.theguardian.com/uk/environment",
          apiUrl: "https://content.guardianapis.com/uk/environment",
          code: "uk",
        },
        {
          id: "us/environment",
          webTitle: "Environment",
          webUrl: "https://www.theguardian.com/us/environment",
          apiUrl: "https://content.guardianapis.com/us/environment",
          code: "us",
        },
      ],
    },
    {
      id: "education",
      webTitle: "Education",
      webUrl: "https://www.theguardian.com/education",
      apiUrl: "https://content.guardianapis.com/education",
      editions: [
        {
          id: "education",
          webTitle: "Education",
          webUrl: "https://www.theguardian.com/education",
          apiUrl: "https://content.guardianapis.com/education",
          code: "default",
        },
      ],
    },
    {
      id: "us-news",
      webTitle: "US news",
      webUrl: "https://www.theguardian.com/us-news",
      apiUrl: "https://content.guardianapis.com/us-news",
      editions: [
        {
          id: "us-news",
          webTitle: "US news",
          webUrl: "https://www.theguardian.com/us-news",
          apiUrl: "https://content.guardianapis.com/us-news",
          code: "default",
        },
      ],
    },
    {
      id: "technology",
      webTitle: "Technology",
      webUrl: "https://www.theguardian.com/technology",
      apiUrl: "https://content.guardianapis.com/technology",
      editions: [
        {
          id: "technology",
          webTitle: "Technology",
          webUrl: "https://www.theguardian.com/technology",
          apiUrl: "https://content.guardianapis.com/technology",
          code: "default",
        },
        {
          id: "au/technology",
          webTitle: "Technology",
          webUrl: "https://www.theguardian.com/au/technology",
          apiUrl: "https://content.guardianapis.com/au/technology",
          code: "au",
        },
        {
          id: "uk/technology",
          webTitle: "Technology",
          webUrl: "https://www.theguardian.com/uk/technology",
          apiUrl: "https://content.guardianapis.com/uk/technology",
          code: "uk",
        },
        {
          id: "us/technology",
          webTitle: "Technology",
          webUrl: "https://www.theguardian.com/us/technology",
          apiUrl: "https://content.guardianapis.com/us/technology",
          code: "us",
        },
      ],
    },
    {
      id: "money",
      webTitle: "Money",
      webUrl: "https://www.theguardian.com/money",
      apiUrl: "https://content.guardianapis.com/money",
      editions: [
        {
          id: "money",
          webTitle: "Money",
          webUrl: "https://www.theguardian.com/money",
          apiUrl: "https://content.guardianapis.com/money",
          code: "default",
        },
        {
          id: "uk/money",
          webTitle: "Money",
          webUrl: "https://www.theguardian.com/uk/money",
          apiUrl: "https://content.guardianapis.com/uk/money",
          code: "uk",
        },
        {
          id: "us/money",
          webTitle: "Money",
          webUrl: "https://www.theguardian.com/us/money",
          apiUrl: "https://content.guardianapis.com/us/money",
          code: "us",
        },
        {
          id: "au/money",
          webTitle: "Money",
          webUrl: "https://www.theguardian.com/au/money",
          apiUrl: "https://content.guardianapis.com/au/money",
          code: "au",
        },
      ],
    },
    {
      id: "film",
      webTitle: "Film",
      webUrl: "https://www.theguardian.com/film",
      apiUrl: "https://content.guardianapis.com/film",
      editions: [
        {
          id: "film",
          webTitle: "Film",
          webUrl: "https://www.theguardian.com/film",
          apiUrl: "https://content.guardianapis.com/film",
          code: "default",
        },
        {
          id: "au/film",
          webTitle: "Film",
          webUrl: "https://www.theguardian.com/au/film",
          apiUrl: "https://content.guardianapis.com/au/film",
          code: "au",
        },
        {
          id: "uk/film",
          webTitle: "Film",
          webUrl: "https://www.theguardian.com/uk/film",
          apiUrl: "https://content.guardianapis.com/uk/film",
          code: "uk",
        },
        {
          id: "us/film",
          webTitle: "Film",
          webUrl: "https://www.theguardian.com/us/film",
          apiUrl: "https://content.guardianapis.com/us/film",
          code: "us",
        },
      ],
    },
    {
      id: "society",
      webTitle: "Society",
      webUrl: "https://www.theguardian.com/society",
      apiUrl: "https://content.guardianapis.com/society",
      editions: [
        {
          id: "society",
          webTitle: "Society",
          webUrl: "https://www.theguardian.com/society",
          apiUrl: "https://content.guardianapis.com/society",
          code: "default",
        },
      ],
    },
    {
      id: "books",
      webTitle: "Books",
      webUrl: "https://www.theguardian.com/books",
      apiUrl: "https://content.guardianapis.com/books",
      editions: [
        {
          id: "books",
          webTitle: "Books",
          webUrl: "https://www.theguardian.com/books",
          apiUrl: "https://content.guardianapis.com/books",
          code: "default",
        },
      ],
    },
    {
      id: "lifeandstyle",
      webTitle: "Life and style",
      webUrl: "https://www.theguardian.com/lifeandstyle",
      apiUrl: "https://content.guardianapis.com/lifeandstyle",
      editions: [
        {
          id: "lifeandstyle",
          webTitle: "Life and style",
          webUrl: "https://www.theguardian.com/lifeandstyle",
          apiUrl: "https://content.guardianapis.com/lifeandstyle",
          code: "default",
        },
        {
          id: "au/lifeandstyle",
          webTitle: "Life and style",
          webUrl: "https://www.theguardian.com/au/lifeandstyle",
          apiUrl: "https://content.guardianapis.com/au/lifeandstyle",
          code: "au",
        },
        {
          id: "uk/lifeandstyle",
          webTitle: "Life and style",
          webUrl: "https://www.theguardian.com/uk/lifeandstyle",
          apiUrl: "https://content.guardianapis.com/uk/lifeandstyle",
          code: "uk",
        },
        {
          id: "us/lifeandstyle",
          webTitle: "Life and style",
          webUrl: "https://www.theguardian.com/us/lifeandstyle",
          apiUrl: "https://content.guardianapis.com/us/lifeandstyle",
          code: "us",
        },
      ],
    },
    {
      id: "music",
      webTitle: "Music",
      webUrl: "https://www.theguardian.com/music",
      apiUrl: "https://content.guardianapis.com/music",
      editions: [
        {
          id: "music",
          webTitle: "Music",
          webUrl: "https://www.theguardian.com/music",
          apiUrl: "https://content.guardianapis.com/music",
          code: "default",
        },
      ],
    },
    {
      id: "politics",
      webTitle: "Politics",
      webUrl: "https://www.theguardian.com/politics",
      apiUrl: "https://content.guardianapis.com/politics",
      editions: [
        {
          id: "politics",
          webTitle: "Politics",
          webUrl: "https://www.theguardian.com/politics",
          apiUrl: "https://content.guardianapis.com/politics",
          code: "default",
        },
      ],
    },
    {
      id: "commentisfree",
      webTitle: "Opinion",
      webUrl: "https://www.theguardian.com/commentisfree",
      apiUrl: "https://content.guardianapis.com/commentisfree",
      editions: [
        {
          id: "commentisfree",
          webTitle: "Opinion",
          webUrl: "https://www.theguardian.com/commentisfree",
          apiUrl: "https://content.guardianapis.com/commentisfree",
          code: "default",
        },
        {
          id: "au/commentisfree",
          webTitle: "Opinion",
          webUrl: "https://www.theguardian.com/au/commentisfree",
          apiUrl: "https://content.guardianapis.com/au/commentisfree",
          code: "au",
        },
        {
          id: "uk/commentisfree",
          webTitle: "Opinion",
          webUrl: "https://www.theguardian.com/uk/commentisfree",
          apiUrl: "https://content.guardianapis.com/uk/commentisfree",
          code: "uk",
        },
        {
          id: "us/commentisfree",
          webTitle: "Opinion",
          webUrl: "https://www.theguardian.com/us/commentisfree",
          apiUrl: "https://content.guardianapis.com/us/commentisfree",
          code: "us",
        },
      ],
    },
    {
      id: "media",
      webTitle: "Media",
      webUrl: "https://www.theguardian.com/media",
      apiUrl: "https://content.guardianapis.com/media",
      editions: [
        {
          id: "media",
          webTitle: "Media",
          webUrl: "https://www.theguardian.com/media",
          apiUrl: "https://content.guardianapis.com/media",
          code: "default",
        },
        {
          id: "au/media",
          webTitle: "Media",
          webUrl: "https://www.theguardian.com/au/media",
          apiUrl: "https://content.guardianapis.com/au/media",
          code: "au",
        },
        {
          id: "uk/media",
          webTitle: "Media",
          webUrl: "https://www.theguardian.com/uk/media",
          apiUrl: "https://content.guardianapis.com/uk/media",
          code: "uk",
        },
        {
          id: "us/media",
          webTitle: "Media",
          webUrl: "https://www.theguardian.com/us/media",
          apiUrl: "https://content.guardianapis.com/us/media",
          code: "us",
        },
      ],
    },
    {
      id: "uk-news",
      webTitle: "UK news",
      webUrl: "https://www.theguardian.com/uk-news",
      apiUrl: "https://content.guardianapis.com/uk-news",
      editions: [
        {
          id: "uk-news",
          webTitle: "UK news",
          webUrl: "https://www.theguardian.com/uk-news",
          apiUrl: "https://content.guardianapis.com/uk-news",
          code: "default",
        },
      ],
    },
    {
      id: "business",
      webTitle: "Business",
      webUrl: "https://www.theguardian.com/business",
      apiUrl: "https://content.guardianapis.com/business",
      editions: [
        {
          id: "business",
          webTitle: "Business",
          webUrl: "https://www.theguardian.com/business",
          apiUrl: "https://content.guardianapis.com/business",
          code: "default",
        },
        {
          id: "uk/business",
          webTitle: "Business",
          webUrl: "https://www.theguardian.com/uk/business",
          apiUrl: "https://content.guardianapis.com/uk/business",
          code: "uk",
        },
        {
          id: "us/business",
          webTitle: "Business",
          webUrl: "https://www.theguardian.com/us/business",
          apiUrl: "https://content.guardianapis.com/us/business",
          code: "us",
        },
        {
          id: "au/business",
          webTitle: "Business",
          webUrl: "https://www.theguardian.com/au/business",
          apiUrl: "https://content.guardianapis.com/au/business",
          code: "au",
        },
      ],
    },
    {
      id: "football",
      webTitle: "Football",
      webUrl: "https://www.theguardian.com/football",
      apiUrl: "https://content.guardianapis.com/football",
      editions: [
        {
          id: "football",
          webTitle: "Football",
          webUrl: "https://www.theguardian.com/football",
          apiUrl: "https://content.guardianapis.com/football",
          code: "default",
        },
      ],
    },
    {
      id: "sport",
      webTitle: "Sport",
      webUrl: "https://www.theguardian.com/sport",
      apiUrl: "https://content.guardianapis.com/sport",
      editions: [
        {
          id: "sport",
          webTitle: "Sport",
          webUrl: "https://www.theguardian.com/sport",
          apiUrl: "https://content.guardianapis.com/sport",
          code: "default",
        },
        {
          id: "uk/sport",
          webTitle: "Sport",
          webUrl: "https://www.theguardian.com/uk/sport",
          apiUrl: "https://content.guardianapis.com/uk/sport",
          code: "uk",
        },
        {
          id: "us/sport",
          webTitle: "Sport",
          webUrl: "https://www.theguardian.com/us/sport",
          apiUrl: "https://content.guardianapis.com/us/sport",
          code: "us",
        },
        {
          id: "au/sport",
          webTitle: "Sport",
          webUrl: "https://www.theguardian.com/au/sport",
          apiUrl: "https://content.guardianapis.com/au/sport",
          code: "au",
        },
      ],
    },
    {
      id: "world",
      webTitle: "World news",
      webUrl: "https://www.theguardian.com/world",
      apiUrl: "https://content.guardianapis.com/world",
      editions: [
        {
          id: "world",
          webTitle: "World news",
          webUrl: "https://www.theguardian.com/world",
          apiUrl: "https://content.guardianapis.com/world",
          code: "default",
        },
      ],
    },
  ];

  private getSections = async (
    str: string,
    signal?: AbortSignal
  ): Promise<TextSuggestionOption[]> => {
    const sections = str.length
      ? await this.getJson<{ response: SectionsResponse }>(
          "sections",
          { q: str },
          signal
        ).then((body) => body.response.results)
      : this.mostUsedSections;

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

    const result = (await (await fetch(url, { signal })).json()) as T;

    this.cache.put(url, result);
    return result;
  }
}
