import { describe, expect, it } from "bun:test";
import {
  docToCqlStr,
  getNextPositionAfterTypeaheadSelection,
  mapResult,
  mapTokens,
  tokensToDoc,
} from "./utils";
import { POLARITY, schema } from "./schema";
import { builders } from "prosemirror-test-builder";
import { createParser } from "../../lang/Cql";

describe("utils", () => {
  const { chip, chipKey, chipValue, doc, queryStr } = builders(schema);

  const queryToProseMirrorTokens = (query: string) => {
    const result = createParser()(query);
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

  describe("tokensToDoc", () => {
    it("should create a node from a list of tokens", async () => {
      const tokens = await queryToProseMirrorTokens("text +key:value text");
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr("text"),
        chip({ [POLARITY]: "+" }, chipKey("key"), chipValue("value")),
        queryStr("text"),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should insert a queryStr node if the query starts with a KV pair", async () => {
      const tokens = await queryToProseMirrorTokens("+key:value");
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr(),
        chip(chipKey("key"), chipValue("value")),
        queryStr(),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should handle negations for fields", async () => {
      const tokens = await queryToProseMirrorTokens("-key:value");
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr(),
        chip({ [POLARITY]: "-" }, chipKey("key"), chipValue("value")),
        queryStr(),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should handle negations for string expressions", async () => {
      const tokens = await queryToProseMirrorTokens("-str");
      const node = tokensToDoc(tokens);

      const expected = doc(queryStr("-str"));

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should insert a queryStr node if the query starts with a KV pair", async () => {
      const tokens = await queryToProseMirrorTokens(":value");
      const node = tokensToDoc(tokens);

      const expected = doc(queryStr(":value"));

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should preserve whitespace at the start of the document", async () => {
      const tokens = await queryToProseMirrorTokens(" this AND +key");
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr(" this AND"),
        chip(chipKey("key"), chipValue()),
        queryStr(),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should preserve whitespace at the start of the document beginning with a chip", async () => {
      const tokens = await queryToProseMirrorTokens("  +key");
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr("  "),
        chip(chipKey("key"), chipValue()),
        queryStr(),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should preserve whitespace at end of non-chip tokens", async () => {
      const tokens = await queryToProseMirrorTokens("this AND  +key");
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr("this AND "),
        chip(chipKey("key"), chipValue()),
        queryStr(),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should preserve whitespace at end of query", async () => {
      const tokens = await queryToProseMirrorTokens("example   ");
      const node = tokensToDoc(tokens);

      const expected = doc(queryStr("example   "));

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should preserve whitespace within values that have whitespace", async () => {
      const tokens = await queryToProseMirrorTokens(
        'example +key:"1 2" example',
      );
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr("example"),
        chip(chipKey("key"), chipValue("1 2")),
        queryStr("example"),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should unescape quotes within keys and values", async () => {
      const tokens = await queryToProseMirrorTokens(`+"key\\"":"value\\""`);
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr(""),
        chip(chipKey(`key"`), chipValue(`value"`)),
        queryStr(""),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should create chips for partial tags that precede existing tags", async () => {
      const tokens = await queryToProseMirrorTokens("+ +tag");
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr(),
        chip(chipKey(), chipValue()),
        queryStr(),
        chip(chipKey("tag"), chipValue()),
        queryStr(),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });
  });

  describe("mapTokens", () => {
    describe("should map tokens to text positions", () => {
      it("with parens", async () => {
        const text = await getTextFromTokenRanges("(b OR c)");

        expect(text).toEqual(["(", "b", "OR", "c", ")", ""]);
      });

      it("with search text and tag", async () => {
        const text = await getTextFromTokenRanges("text +key:value text");

        expect(text).toEqual(["text", "key", "value", "text", ""]);
      });

      it("with parens and tags", async () => {
        const text = await getTextFromTokenRanges(
          "text (b OR c) +key:value text (b OR c)",
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

      it("with a query field", async () => {
        const text = await getTextFromTokenRanges("+tag:test");

        expect(text).toEqual(["tag", "test", ""]);
      });

      it("with a query field with a quoted value and whitespace", async () => {
        const text = await getTextFromTokenRanges('+tag:"1 2" a +tag:"3 4" b');

        expect(text).toEqual(["tag", "1 2", "a", "tag", "3 4", "b", ""]);
      });

      it("with a query field with a quoted key", async () => {
        const text = await getTextFromTokenRanges('+"ta g":"1 2"');

        expect(text).toEqual(["ta g", "1 2", ""]);
      });

      it("with two queries", async () => {
        const text = await getTextFromTokenRanges("+key:value +key2:value2 ");

        expect(text).toEqual(["key", "value", "key2", "value2", ""]);
      });

      it("with an incomplete chip", async () => {
        const text = await getTextFromTokenRanges("+: a b c");

        expect(text).toEqual(["", "", "a", "b", "c", ""]);
      });

      it("with chips without prefixes", async () => {
        const text = await getTextFromTokenRanges("this:that this:that");

        expect(text).toEqual(["this", "that", "this", "that", ""]);
      });

      it("with binary queries in the middle of tags", async () => {
        const text = await getTextFromTokenRanges(
          "+key:value (a OR b) +key2:value2",
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
    it("should move to value position from the end of a key", () => {
      const currentDoc = doc(
        queryStr(),
        chip(chipKey("key<fromPos>"), chipValue("<toPos>")),
        queryStr(),
      );

      const insertPos = getNextPositionAfterTypeaheadSelection(
        currentDoc,
        currentDoc.tag.fromPos,
      );

      expect(insertPos).toBe(currentDoc.tag.toPos);
    });

    it("should move to queryStr position from the end of a value", () => {
      const currentDoc = doc(
        queryStr(),
        chip(chipKey("key"), chipValue("<fromPos>")),
        queryStr("<toPos>"),
      );

      const insertPos = getNextPositionAfterTypeaheadSelection(
        currentDoc,
        currentDoc.tag.fromPos,
      );

      expect(insertPos).toBe(currentDoc.tag.toPos);
    });

    it("should move to queryStr position from the end of a value that contains whitespace", () => {
      const currentDoc = doc(
        queryStr(),
        chip(chipKey("key"), chipValue("A key<fromPos>")),
        queryStr("<toPos>"),
      );

      const insertPos = getNextPositionAfterTypeaheadSelection(
        currentDoc,
        currentDoc.tag.fromPos,
      );

      expect(insertPos).toBe(currentDoc.tag.toPos);
    });
  });

  describe("docToCqlStr", () => {
    it("should convert a doc to a query string", () => {
      const queryDoc = doc(
        queryStr("example"),
        chip(chipKey("tag"), chipValue("tags-are-magic")),
        queryStr(),
      );

      const query = "example +tag:tags-are-magic ";

      expect(docToCqlStr(queryDoc)).toBe(query);
    });

    it("should add quotes for chip values that contain whitespace", () => {
      const queryDoc = doc(
        queryStr("example"),
        chip(chipKey("tag"), chipValue("Tag with whitespace")),
        queryStr(),
      );

      const query = 'example +tag:"Tag with whitespace" ';

      expect(docToCqlStr(queryDoc)).toBe(query);
    });

    it("should add quotes for chip keys and values that contain whitespace", () => {
      const queryDoc = doc(
        queryStr("example"),
        chip(chipKey(`tag"key`), chipValue(`tag"value`)),
        queryStr(),
      );

      const query = 'example +"tag\\"key":"tag\\"value" ';

      expect(docToCqlStr(queryDoc)).toBe(query);
    });

    it("should not prepend whitespace when the doc starts with a chip", () => {
      const queryDoc = doc(
        queryStr(""),
        chip(chipKey("tag"), chipValue("tags-are-magic")),
        queryStr(),
      );

      const query = "+tag:tags-are-magic ";

      expect(docToCqlStr(queryDoc)).toBe(query);
    });

    it("should join chips with a single whitespace", () => {
      const queryDoc = doc(
        queryStr(""),
        chip(chipKey("tag"), chipValue("tags-are-magic")),
        chip(chipKey("tag"), chipValue("tags-are-magic")),
        queryStr(),
      );

      const query = "+tag:tags-are-magic +tag:tags-are-magic ";

      expect(docToCqlStr(queryDoc)).toBe(query);
    });

    it("should apply negations to fields and strings", () => {
      const queryDoc = doc(
        queryStr("-example "),
        chip({ [POLARITY]: "-" }, chipKey("tag"), chipValue("tags-are-magic")),
        chip(chipKey("tag"), chipValue("tags-are-magic")),
        queryStr(),
      );

      const query = "-example -tag:tags-are-magic +tag:tags-are-magic ";

      expect(docToCqlStr(queryDoc)).toBe(query);
    });
  });
});
