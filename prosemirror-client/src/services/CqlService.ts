import { Cql, CqlResult } from "../lang/Cql";
import { Typeahead } from "../lang/typeahead";
import { TypeaheadHelpersCapi } from "../lang/typeaheadHelpersCapi";

export type CqlError = {
  position?: number;
  message: string;
};

export interface CqlServiceInterface {
  setUrl(url: string): void;

  fetchResult(query: string): Promise<CqlResult>;

  cancel(): void;
}

export class CqlServerService implements CqlServiceInterface {
  private abortController: AbortController | undefined;

  constructor(private url: string) {}

  public setUrl(url: string) {
    this.url = url;
  }

  public async fetchResult(query: string) {
    this.abortController = new AbortController();
    const urlParams = new URLSearchParams();
    urlParams.append("query", query);
    const request = await fetch(`${this.url}/cql?${urlParams}`, {
      signal: this.abortController.signal,
    });

    return (await request.json()) as CqlResult;
  }

  public cancel() {
    this.abortController?.abort();
  }
}

export class CqlClientService implements CqlServiceInterface {
  private abortController: AbortController | undefined;
  private cql: Cql;

  constructor(private capiBaseUrl: string, apiKey: string) {
    const typeaheadResolvers = new TypeaheadHelpersCapi(capiBaseUrl, apiKey);
    const typeahead = new Typeahead(typeaheadResolvers.fieldResolvers);
    this.cql = new Cql(typeahead);
  }

  public setUrl(url: string) {
    this.capiBaseUrl = url;
  }

  public async fetchResult(query: string) {
    return await this.cql.run(query);
  }

  public cancel() {
    this.abortController?.abort();
  }
}
