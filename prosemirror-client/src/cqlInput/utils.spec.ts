import { describe, expect, test } from "bun:test";
import _tokensWithOneKVPair from "./fixtures/tokens/tokensWithOneKVPair.json";
import _tokensWithTwoKVPairs from "./fixtures/tokens/tokensWithTwoKVPairs.json";
import _tokensWithParens from "./fixtures/tokens/tokensWithParens.json";
import _tokensWithParensAndKVPair from "./fixtures/tokens/tokensWithParensAndKVPair.json";
import _tokensWithTrailingWhitespace from "./fixtures/tokens/tokensWithTrailingWhitespace.json";
import _tokensWithTagAtBeginning from "./fixtures/tokens/tokensWithTagAtBeginning.json";
import {
  ProseMirrorToken,
  mapTokens,
  toProseMirrorTokens,
  tokensToNodes,
} from "./utils";
import {
  chip,
  chipKey,
  chipValue,
  chipWrapper,
  doc,
  schema,
  searchText,
} from "./schema";

describe("utils", () => {
  const tokensWithOneKVPair = toProseMirrorTokens(_tokensWithOneKVPair);
  const tokensWithParens = toProseMirrorTokens(_tokensWithParens);
  const tokensWithParensAndKVPair = toProseMirrorTokens(
    _tokensWithParensAndKVPair
  );
  const tokensWithTrailingWhitespace = toProseMirrorTokens(
    _tokensWithTrailingWhitespace
  );
  const tokensWithTagAtBeginning = toProseMirrorTokens(
    _tokensWithTagAtBeginning
  );

  const getTextFromTokenRanges = (tokens: ProseMirrorToken[]) => {
    const mappedTokens = mapTokens(tokens);
    const node = tokensToNodes(tokens);
    return mappedTokens.map(({ from, to, tokenType }) => {
      return tokenType !== "EOF" ? node.textBetween(from, to) : "";
    });
  }
  

  describe("tokensToNode", () => {
    test("creates nodes from a list of tokens - 1", () => {
      const node = tokensToNodes(tokensWithOneKVPair);

      const expected = doc.create(undefined, [
        searchText.create(undefined, [schema.text("text ")]),
        chipWrapper.create(undefined, [
          chip.create(undefined, [
            chipKey.create(undefined, schema.text("key")),
            chipValue.create(undefined, schema.text("value")),
          ]),
        ]),

        searchText.create(undefined, [schema.text("text")]),
      ]);

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    test("should preserve whitespace at end of query", () => {
      const node = tokensToNodes(tokensWithTrailingWhitespace);

      const expected = doc.create(undefined, [
        searchText.create(undefined, [schema.text("example   ")]),
      ]);

      expect(node.toJSON()).toEqual(expected.toJSON());
    });
  });

  describe("mapTokens", () => {
    test("should map tokens to text positions with parens", () => {
      const text = getTextFromTokenRanges(tokensWithParens);

      expect(text).toEqual(["(", "b", "OR", "c", ")", ""]);
    });

    test("should map tokens to text positions with parens and tags", () => {
      const text = getTextFromTokenRanges(tokensWithParensAndKVPair);

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

    test("should map tokens to text positions with a tag at the beginning", () => {
      const text = getTextFromTokenRanges(tokensWithTagAtBeginning);

      expect(text).toEqual(["tag", "test", ""]);
    });
  });
});
