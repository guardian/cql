import { describe, expect, test } from "bun:test";
import {
  docToQueryStr,
  getNextPositionAfterTypeaheadSelection,
  mapResult,
  mapTokens,
  tokensToDoc,
} from "./utils";
import { schema } from "./schema";
import { builders } from "prosemirror-test-builder";
import { Typeahead } from "../../lang/typeahead";
import { TestTypeaheadHelpers } from "../../lang/typeaheadHelpersTest";
import { Cql } from "../../lang/Cql";

describe("utils", () => {
  const { chip, chipKey, chipValue, doc, searchText } = builders(schema);

  const cql = new Cql(new Typeahead(new TestTypeaheadHelpers().fieldResolvers));

  const queryToProseMirrorTokens = async (query: string) => {
    const result = await cql.parse(query);
    const { tokens } = mapResult(result);
    return tokens;
  };

  /**
   * Translate a query into tokens, and then map the tokens back on to a ProseMirror document
   * created with those tokens. The resulting text ranges should match the original tokens.
   */
  const getTextFromTokenRanges = async (query: string) => {
    const tokens = await queryToProseMirrorTokens(query);
    const mappedTokens = mapTokens(tokens);
    const node = tokensToDoc(tokens);

    // Implicitly check that the document created by these functions conforms to
    // the schema, so we know tests downstream are dealing with correct data -
    // node.check() will throw if the node content is not valid
    node.check();

    return mappedTokens.map(({ from, to, tokenType }) => {
      return tokenType !== "EOF" ? node.textBetween(from, to) : "";
    });
  };

  describe("tokensToNode", () => {
    test("creates nodes from a list of tokens", async () => {
      const tokens = await queryToProseMirrorTokens("text +key:value text");
      const node = tokensToDoc(tokens);

      const expected = doc(
        searchText("text"),
        chip(chipKey("key"), chipValue("value")),
        searchText("text")
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    test("should insert a searchText node if the query starts with a KV pair", async () => {
      const tokens = await queryToProseMirrorTokens("+key:value");
      const node = tokensToDoc(tokens);

      const expected = doc(
        searchText(),
        chip(chipKey("key"), chipValue("value")),
        searchText()
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    test("should preserve whitespace at the start of the document", async () => {
      const tokens = await queryToProseMirrorTokens(" this AND  +key");
      const node = tokensToDoc(tokens);

      const expected = doc(
        searchText(" this AND "),
        chip(chipKey("key"), chipValue()),
        searchText()
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    test("should preserve whitespace at end of non-chip tokens", async () => {
      const tokens = await queryToProseMirrorTokens("this AND  +key");
      const node = tokensToDoc(tokens);

      const expected = doc(
        searchText("this AND "),
        chip(chipKey("key"), chipValue()),
        searchText()
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    test("should preserve whitespace at end of query", async () => {
      const tokens = await queryToProseMirrorTokens("example   ");
      const node = tokensToDoc(tokens);

      const expected = doc(searchText("example   "));

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    test("should create chipWrappers for partial tags that precede existing tags", async () => {
      const tokens = await queryToProseMirrorTokens("+ +tag");
      const node = tokensToDoc(tokens);

      const expected = doc(
        searchText(),
        chip(chipKey(), chipValue()),
        searchText(),
        chip(chipKey("tag"), chipValue()),
        searchText()
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });
  });

  describe("mapTokens", () => {
    describe("should map tokens to text positions", () => {
      test("with parens", async () => {
        const text = await getTextFromTokenRanges("(b OR c)");

        expect(text).toEqual(["(", "b", "OR", "c", ")", ""]);
      });

      test("with search text and tag", async () => {
        const text = await getTextFromTokenRanges("text +key:value text");

        expect(text).toEqual(["text", "key", "value", "text", ""]);
      });

      test("with parens and tags", async () => {
        const text = await getTextFromTokenRanges(
          "text (b OR c) +key:value text (b OR c)"
        );

        expect(text).toEqual([
          "text",
          "(",
          "b",
          "OR",
          "c",
          ")",
          "key",
          "value",
          "text",
          "(",
          "b",
          "OR",
          "c",
          ")",
          "",
        ]);
      });

      test("with a tag at the beginning", async () => {
        const text = await getTextFromTokenRanges("+tag:test");

        expect(text).toEqual(["tag", "test", ""]);
      });

      test("with two queries", async () => {
        const text = await getTextFromTokenRanges("+key:value +key2:value2 ");

        expect(text).toEqual(["key", "value", "key2", "value2", ""]);
      });

      test("with an incomplete chip", async () => {
        const text = await getTextFromTokenRanges("+: a b c");

        expect(text).toEqual(["", "", "a", "b", "c", ""]);
      });

      test("with binary queries in the middle of tags", async () => {
        const text = await getTextFromTokenRanges(
          "+key:value (a OR b) +key2:value2"
        );

        expect(text).toEqual([
          "key",
          "value",
          "(",
          "a",
          "OR",
          "b",
          ")",
          "key2",
          "value2",
          "",
        ]);
      });
    });
  });

  describe("getNextPositionAfterTypeaheadSelection", () => {
    test("should move to value position from the end of a key", () => {
      const currentDoc = doc(
        searchText(),
        chip(chipKey("key<fromPos>"), chipValue("<toPos>")),
        searchText()
      );

      const insertPos = getNextPositionAfterTypeaheadSelection(
        currentDoc,
        currentDoc.tag.fromPos
      );

      expect(insertPos).toBe(currentDoc.tag.toPos);
    });

    test("should move to searchText position from the end of a value", () => {
      const currentDoc = doc(
        searchText(),
        chip(chipKey("key"), chipValue("<fromPos>")),
        searchText("<toPos>")
      );

      const insertPos = getNextPositionAfterTypeaheadSelection(
        currentDoc,
        currentDoc.tag.fromPos
      );

      expect(insertPos).toBe(currentDoc.tag.toPos);
    });
  });

  describe("docToQueryStr", () => {

    test("should convert a doc to a query string", () => {
      const queryDoc = doc(
        searchText("example"),
        chip(chipKey("tag"), chipValue("tags-are-magic")),
        searchText()
      );

      const queryStr = "example +tag:tags-are-magic ";

      expect(docToQueryStr(queryDoc)).toBe(queryStr);
    });

    test("should not prepend whitespace when the doc starts with a chip", () => {
      const queryDoc = doc(
        searchText(""),
        chip(chipKey("tag"), chipValue("tags-are-magic")),
        searchText()
      );

      const queryStr = "+tag:tags-are-magic ";

      expect(docToQueryStr(queryDoc)).toBe(queryStr);
    });

    test("should join chips with a single whitespace", () => {
      const queryDoc = doc(
        searchText(""),
        chip(chipKey("tag"), chipValue("tags-are-magic")),
        chip(chipKey("tag"), chipValue("tags-are-magic")),
        searchText()
      );

      const queryStr = "+tag:tags-are-magic +tag:tags-are-magic ";

      expect(docToQueryStr(queryDoc)).toBe(queryStr);
    });
  })
});
