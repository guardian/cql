import { describe, expect, test } from "bun:test";
import {
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
    test("should map tokens to text positions with parens", async () => {
      const text = await getTextFromTokenRanges("(b OR c)");

      expect(text).toEqual(["(", "b", "OR", "c", ")", ""]);
    });

    test("should map tokens to text positions with search text and tag", async () => {
      const text = await getTextFromTokenRanges("text +key:value text");

      expect(text).toEqual(["text", "key", "value", "text", ""]);
    });

    test("should map tokens to text positions with parens and tags", async () => {
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

    // @todo: the following tests begin with whitespace because this is how the
    // editor behaves to leave a gap for insertions at the beginning of the
    // document. It'd be better were this not necessary, perhaps by hiding it as
    // an implementation detail.
    test("should map tokens to text positions with a tag at the beginning", async () => {
      const text = await getTextFromTokenRanges(" +tag:test");

      expect(text).toEqual(["tag", "test", ""]);
    });

    test("should map tokens to text positions with two queries", async () => {
      const text = await getTextFromTokenRanges(" +key:value +key2:value2 ");

      expect(text).toEqual(["key", "value", "key2", "value2", ""]);
    });

    test("should map tokens to text positions with binary queries in the middle of tags", async () => {
      const text = await getTextFromTokenRanges(
        " +key:value (a OR b) +key2:value2"
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

  describe("getNextPositionAfterTypeaheadSelection", () => {
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
});
