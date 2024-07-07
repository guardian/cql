import { CqlResult, CqlServiceInterface } from "../../services/CqlService";
import empty from "./responses/<empty>.json";
import e from "./responses/e.json";
import ex from "./responses/ex.json";
import exa from "./responses/exa.json";
import exam from "./responses/exam.json";
import examp from "./responses/examp.json";
import exampl from "./responses/exampl.json";
import example from "./responses/example.json";
import example_ from "./responses/example_.json";
import example_plus from "./responses/example_+.json";
import example_pluscolon from "./responses/example_+:.json";
import example_tags_are_magic from "./responses/example_+tag:tags-are-magic.json";

const resultFixtures: Record<string, CqlResult> = {
  e,
  ex,
  exa,
  exam,
  examp,
  exampl,
  example,
  "example ": example_,
  "example +": example_plus,
  "example +:  ": example_pluscolon,
  "example_+tag:tags-are-magic": example_tags_are_magic,
} as any;

export class TestCqlService implements CqlServiceInterface {
  private abortController: AbortController | undefined;

  /**
   * @param url
   * @param resultFixtures A map from query strings to results
   */
  constructor(private url: string) {}

  public setUrl(url: string) {
    this.url = url;
  }

  public async fetchResult(query: string) {
    const result =
      query === "" ? (empty as any as CqlResult) : resultFixtures[query];

    if (result) {
      return Promise.resolve(result);
    }

    return Promise.reject(
      new Error(`Fixture not found for query string '${query}'`)
    );
  }

  public cancel() {
    this.abortController?.abort();
  }
}
