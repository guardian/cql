import { describe, expect, test } from "bun:test";
import { Mapping } from "prosemirror-transform";
import _tokensWithOneKVPair from "./fixtures/tokensWithOneKVPair.json";
import _tokensWithTwoKVPairs from "./fixtures/tokensWithTwoKVPairs.json";
import _tokensWithParens from "./fixtures/tokensWithParens.json";
import _tokensWithParensAndKVPair from "./fixtures/tokensWithParensAndKVPair.json";
import {
  ProseMirrorToken,
  createTokenMap,
  logNode,
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
  const tokensWithTwoKVPairs = toProseMirrorTokens(_tokensWithTwoKVPairs);
  const tokensWithParens = toProseMirrorTokens(_tokensWithParens);
  const tokensWithParensAndKVPair = toProseMirrorTokens(
    _tokensWithParensAndKVPair
  );

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
  });

  describe("mapTokens", () => {
    test("should map tokens to text positions - 1", () => {
      const mappedTokens = mapTokens(tokensWithParens);
      const node = tokensToNodes(mappedTokens);

      const text = mappedTokens.map(({ from, to }) => {
        return node.textBetween(from, to);
      });

      expect(text).toEqual(["(", "b", "OR", "c", ")", ""]);
    });
  });

  test("should map tokens to text positions - 2", () => {
    const mappedTokens = mapTokens(tokensWithParensAndKVPair);
    const node = tokensToNodes(tokensWithParensAndKVPair);
    const text = mappedTokens.map(({ from, to }) => {
      return node.textBetween(from, to);
    });

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
});
