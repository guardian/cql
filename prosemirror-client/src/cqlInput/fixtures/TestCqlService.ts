import { CqlServiceInterface } from "../../services/CqlService";
import empty from "./responses/<empty>";
import example_plus from "./responses/example_+";
import example_pluscolon from "./responses/example_+:";
import example_plustagcolon from "./responses/example_+tag:";
import example_tags_are_magic from "./responses/example_+tag:tags-are-magic";
import { createTextResponse } from "./responses/createTextResponse";
import { CqlResult } from "../../lang/Cql";

const resultFixtures: Record<string, CqlResult> = {
  e: createTextResponse("e"),
  ex: createTextResponse("ex"),
  exa: createTextResponse("exa"),
  exam: createTextResponse("exam"),
  examp: createTextResponse("examp"),
  exampl: createTextResponse("exampl"),
  example: createTextResponse("example"),
  "example ": createTextResponse("example "),
  "<example ": createTextResponse("<example "),
  "example >": createTextResponse("example >"),
  "<example >": createTextResponse("example >"),
  "example +": example_plus,
  "example +:  ": example_pluscolon,
  "example +tag:  ": example_plustagcolon,
  "example +tag:tags-are-magic": example_tags_are_magic,
  "example +tag:tags-are-magic ": example_tags_are_magic,
  "example +tag:tags-are-magic  ": example_tags_are_magic,
};

export class TestCqlService implements CqlServiceInterface {
  private abortController: AbortController | undefined;

  // @ts-ignore unused var – url not relevant for test
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
