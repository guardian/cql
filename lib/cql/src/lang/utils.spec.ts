import { describe, expect, test } from "bun:test";
import { unescapeStr } from "./utils";

describe("language utils", () => {
    test("unescapeStr", () => {
        expect(unescapeStr(`\\"sausages\\"`)).toBe(`"sausages"`)
    })
})