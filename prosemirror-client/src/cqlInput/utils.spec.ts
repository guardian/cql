import { describe, expect, test } from "bun:test";
import { Mapping } from "prosemirror-transform";
import tokensWithOneKVPair from "./fixtures/tokensWithOneKVPair.json";
import tokensWithTwoKVPairs from "./fixtures/tokensWithTwoKVPairs.json";
import { mapTokens, tokensToNodes } from "./utils";
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
  describe("tokensToNode", () => {
    test("creates nodes from a list of tokens", () => {
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
    test("map positions through query keys and values", () => {
      const map = mapTokens(tokensWithOneKVPair);
      const lastPos =
        tokensWithOneKVPair
          .map((token) => token.end)
          .toSorted((a, b) => a - b)
          .pop() ?? 0;

      const mappedPositions = [] as number[];
      for (let pos = 0; pos <= lastPos; pos++) {
        mappedPositions.push(map.map(pos));
      }

      const expectedPositions = [
        0, 0, 1, 2, 3, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
        24, 25,
      ];

      expect(mappedPositions).toEqual(expectedPositions);
    });

    type NodeMap = { start: number; end: number; type: string }[];

    const mapTokenPositions = (
      tokens: Token[],
      type: string,
      mapping: Mapping
    ) =>
      tokens
        .filter((token) => token.tokenType === type)
        .map((token) => ({
          start: mapping.map(token.start),
          end: mapping.map(token.end),
          tokenType: token.tokenType,
        }));

    const toRange = <
      T extends {
        start: number;
        end: number;
      }
    >({
      start,
      end,
    }: T): { start: number; end: number } => ({ start, end });

    const toTextNodePos = (nodeMap: NodeMap, type: string) => {
      const chipKeyNodeIndexes = nodeMap.reduce<number[]>(
        (acc, node, index) => (node.type === type ? acc.concat(index) : acc),
        []
      );
      return chipKeyNodeIndexes.map((i) => toRange(nodeMap[i + 1]));
    };

    test("should map token positions into node text positions", () => {
      const mapping = mapTokens(tokensWithTwoKVPairs);
      const node = tokensToNodes(tokensWithTwoKVPairs);
      const nodeMap = [] as NodeMap;
      node.nodesBetween(0, node.content.size, (node, pos) => {
        nodeMap.push({
          start: pos,
          end: pos + node.nodeSize,
          type: node.type.name,
        });
      });

      const chipKeyTokenPos = mapTokenPositions(
        tokensWithTwoKVPairs,
        "QUERY_FIELD_KEY",
        mapping
      ).map(toRange);
      const chipValueTokenPos = mapTokenPositions(
        tokensWithTwoKVPairs,
        "QUERY_VALUE",
        mapping
      ).map(toRange);

      const chipKeyTextPos = toTextNodePos(nodeMap, "chipKey");
      const chipValueNodePos = toTextNodePos(nodeMap, "chipValue");

      expect(chipKeyTokenPos).toEqual(chipKeyTextPos);
      expect(chipValueTokenPos).toEqual(chipValueNodePos);
    });
  });
});
