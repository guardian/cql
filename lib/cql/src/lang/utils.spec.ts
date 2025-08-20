import { describe, expect, test } from "bun:test";
import { unescapeQuotes } from "./utils";

describe("language utils", () => {
    test("unescapeStr", () => {
        expect(unescapeQuotes(`\\"sausages\\"`)).toBe(`"sausages"`)
    })
})