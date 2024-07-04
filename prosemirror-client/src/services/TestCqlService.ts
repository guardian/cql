import { CqlResult, CqlServiceInterface } from "./CqlService";

export class TestCqlService implements CqlServiceInterface {
  private abortController: AbortController | undefined;

  /**
   * @param url
   * @param resultFixtures A map from query strings to results
   */
  constructor(
    private url: string,
    private resultFixtures: Record<string, CqlResult>
  ) {}

  public setUrl(url: string) {
    this.url = url;
  }

  public async fetchResult(query: string) {
    const result = this.resultFixtures[query];

    if (result) {
      return Promise.resolve(result);
    }

    return Promise.reject(
      new Error(`Fixture not found for query string ${query}`)
    );
  }

  public cancel() {
    this.abortController?.abort();
  }
}
