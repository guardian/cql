import { describe, expect, it, test } from "bun:test";
import {
  createProseMirrorTokenToDocumentMap as createProseMirrorTokenToDocumentMapping,
  docToCqlStr,
  findNodeAt,
  getNextPositionAfterTypeaheadSelection,
  mapResult,
  mapTokens,
  tokensToDoc,
} from "./utils";
import { POLARITY, schema } from "./schema";
import { builders } from "prosemirror-test-builder";
import { createParser } from "../../lang/Cql";
import { Node } from "prosemirror-model";
import {
  escapeQuotes,
  getNPermutations,
  getPermutations,
  shouldQuoteFieldValue,
} from "../../lang/utils";
import { pseudoRandom } from "../../utils/test";
import { logNode } from "./debug";

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
    const tokens = queryToProseMirrorTokens(query);
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

  /**
   * Translate a query into tokens, and then map the tokens back on to a ProseMirror document
   * created with those tokens. The resulting text ranges should match the original tokens.
   */
  const assertCqlStrPosFromDocPos = async (
    query: string,
    getPos: (node: Node) => number,
    expectedIndexForQuery: number,
  ) => {
    const tokens = queryToProseMirrorTokens(query);
    const mapping = createProseMirrorTokenToDocumentMapping(tokens).invert();
    const node = tokensToDoc(tokens);

    node.check();

    expect(
      mapping.map(getPos(node)),
      `Expected ProseMirror document position ${getPos(node)} to map to CQL position ${expectedIndexForQuery} ('${query[expectedIndexForQuery]}')`,
    ).toBe(expectedIndexForQuery);
  };

  describe("tokensToDoc", () => {
    it("should create a node from a list of tokens", async () => {
      const tokens = queryToProseMirrorTokens("text +key:value text");
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr("text"),
        chip({ [POLARITY]: "+" }, chipKey("key"), chipValue("value")),
        queryStr("text"),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should insert a queryStr node if the query starts with a KV pair", async () => {
      const tokens = queryToProseMirrorTokens("+key:value");
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr(),
        chip(chipKey("key"), chipValue("value")),
        queryStr(),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should handle negations for fields", async () => {
      const tokens = queryToProseMirrorTokens("-key:value");
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr(),
        chip({ [POLARITY]: "-" }, chipKey("key"), chipValue("value")),
        queryStr(),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should handle negations for string expressions", async () => {
      const tokens = queryToProseMirrorTokens("-str");
      const node = tokensToDoc(tokens);

      const expected = doc(queryStr("-str"));

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should insert a queryStr node if the query starts with a KV pair", async () => {
      const tokens = queryToProseMirrorTokens(":value");
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr(),
        chip(chipKey(""), chipValue("")),
        queryStr("value"),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should preserve whitespace at the start of the document", async () => {
      const tokens = queryToProseMirrorTokens(" this AND +key:");
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr(" this AND"),
        chip(chipKey("key"), chipValue()),
        queryStr(),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should preserve whitespace at the start of the document beginning with a chip", async () => {
      const tokens = queryToProseMirrorTokens("  +key:");
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr("  "),
        chip(chipKey("key"), chipValue()),
        queryStr(),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should preserve whitespace at end of non-chip tokens", async () => {
      const tokens = queryToProseMirrorTokens("this AND  +key:");
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr("this AND "),
        chip(chipKey("key"), chipValue()),
        queryStr(),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should preserve whitespace at end of query", async () => {
      const tokens = queryToProseMirrorTokens("example   ");
      const node = tokensToDoc(tokens);

      const expected = doc(queryStr("example   "));

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should preserve whitespace within values that have whitespace", async () => {
      const tokens = queryToProseMirrorTokens('example +key:"1 2" example');
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr("example"),
        chip(chipKey("key"), chipValue("1 2")),
        queryStr("example"),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should unescape quotes within keys and values", async () => {
      const tokens = queryToProseMirrorTokens(`+"key\\"":"value\\""`);
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr(""),
        chip(chipKey(`key"`), chipValue(`value"`)),
        queryStr(""),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });

    it("should remove isolated plus signs", async () => {
      const tokens = queryToProseMirrorTokens("+ +tag:");
      const node = tokensToDoc(tokens);

      const expected = doc(
        queryStr(),
        chip(chipKey("tag"), chipValue()),
        queryStr(),
      );

      expect(node.toJSON()).toEqual(expected.toJSON());
    });
  });

  describe("mapTokens", () => {
    describe("should map tokens to text positions", () => {
      const specs: [string, string, string[]][] = [
        ["with parens", "(b OR c)", ["(", "b", "OR", "c", ")", ""]],
        [
          "with search text and tag",
          "text +key:value text",
          ["text", "", "key", "value", "text", ""],
        ],
        [
          "with parens and tags",
          "text (b OR c) +key:value text (b OR c)",
          [
            "text",
            "(",
            "b",
            "OR",
            "c",
            ")",
            "",
            "key",
            "value",
            "text",
            "(",
            "b",
            "OR",
            "c",
            ")",
            "",
          ],
        ],
        ["with a query field", "+tag:test", ["", "tag", "test", ""]],
        [
          "with a query field with a quoted value and whitespace",
          '+tag:"1 2" a +tag:"3 4" b',
          ["", "tag", "1 2", "a", "", "tag", "3 4", "b", ""],
        ],
        [
          "with a query field with a quoted key",
          '+"ta g":"1 2"',
          ["", "ta g", "1 2", ""],
        ],
        [
          "with polarity symbols",
          "+example -example",
          ["+", "example", "-", "example", ""],
        ],
        [
          "with two queries",
          "+key:value +key2:value2 ",
          ["", "key", "value", "", "key2", "value2", ""],
        ],
        ["with an empty chip key", "+: a b c", ["", "", "a", "b", "c", ""]],
        ["with an empty chip value", "+a: b", ["", "a", "b", ""]],
        [
          "with chips without prefixes",
          "this:that this:that",
          ["this", "that", "this", "that", ""],
        ],
        [
          "with binary queries in the middle of tags",
          "+key:value (a OR b) +key2:value2",
          [
            "",
            "key",
            "value",
            "(",
            "a",
            "OR",
            "b",
            ")",
            "",
            "key2",
            "value2",
            "",
          ],
        ],
      ];

      specs.forEach(([specName, query, expectedTextFromRanges]) => {
        it(specName, async () => {
          const text = await getTextFromTokenRanges(query);

          expect(text).toEqual(expectedTextFromRanges);
        });
      });

      it("with selection in an empty chip key", () => {
        assertCqlStrPosFromDocPos(
          "+:",
          (node) => findNodeAt(0, node, schema.nodes.chipKey) + 1,
          1,
        );
      });

      it("with selection in an empty chip value", () => {
        assertCqlStrPosFromDocPos(
          "+a:",
          (node) => findNodeAt(0, node, schema.nodes.chipValue) + 1,
          2,
        );
      });

      it("with selection at the end of a chip value", () => {
        assertCqlStrPosFromDocPos(
          "+a:b",
          (node) => findNodeAt(0, node, schema.nodes.chipValue) + 2,
          4,
        );
      });

      const getCqlStrPositions = (
        queryWithPos: string,
        positions: Record<string, number> = {},
      ): { query: string; positions: Record<string, number> } => {
        const regex = new RegExp("<(?<position>.*?)>");
        const result = regex.exec(queryWithPos);
        if (!result || !result.groups?.position) {
          return { query: queryWithPos, positions };
        }

        return getCqlStrPositions(queryWithPos.replace(regex, ""), {
          ...positions,
          [result.groups?.position]: result.index,
        });
      };

      const mappingSpecs = [
        {
          name: "a query string",
          queryAndPositions: "<a1>a<a2>",
          doc: doc(queryStr("<a1>a<a2>")),
        },
        {
          name: "an empty chipKey surrounded by empty queryStrs",
          queryAndPositions: "<a>+<b>:<c> <d>",
          doc: doc(
            queryStr("<a>"),
            // Empty chipKey
            chip(chipKey("<b>"), chipValue("<c>")),
            // Empty queryStr
            queryStr("<d>"),
          ),
        },
        {
          name: "an empty chipKey surrounded by contentful queryStrs ",
          queryAndPositions: "<a1>a<a2> +<b>:<c> <d1>c<d2>",
          doc: doc(
            queryStr("<a1>a<a2>"),
            // Empty chipKey
            chip(chipKey("<b>"), chipValue("<c>")),
            // Empty queryStr
            queryStr("<d1>c<d2>"),
          ),
        },
        {
          name: "an empty chipValue",
          queryAndPositions: "<a>+<b1>b<b2>:<c> <d1>d<d2>",
          doc: doc(
            queryStr("<a>"),
            // Empty chipKey
            chip(chipKey("<b1>b<b2>"), chipValue("<c>")),
            // Empty queryStr
            queryStr("<d1>d<d2>"),
          ),
        },
        {
          name: "a chip",
          queryAndPositions: "<a>+<b1>b<b2>:<c1>c<c2> <d1>d<d2>",
          doc: doc(
            queryStr("<a>"),
            // Empty chipKey
            chip(chipKey("<b1>b<b2>"), chipValue("<c1>c<c2>")),
            // Empty queryStr
            queryStr("<d1>d<d2>"),
          ),
        },
        {
          name: "abutting empty chipKeys",
          queryAndPositions: "<a>+<b>: <c>+<d>: ",
          doc: doc(
            queryStr("<a>"),
            // Empty chipKey
            chip(chipKey("<b>"), chipValue()),
            // Empty queryStr
            queryStr("<c>"),
            // Empty chipKey
            chip(chipKey("<d>"), chipValue()),
          ),
        },
      ];

      const smokeTestLiterals = [
        "u",
        // '"',
        "unquoted_string",
        // "quoted string",
        // 'escaped"string',
      ];

      const getSmokeTestString = (
        generator: Generator<number, number, number>,
      ): string =>
        smokeTestLiterals[generator.next().value % smokeTestLiterals.length];

      const getQuotedEscapedStr = (str: string) =>
        shouldQuoteFieldValue(str) ? `"${escapeQuotes(str)}"` : str;

      const smokeTestQueryStrs: Array<
        (key: string, value: string) => [string, Node]
      > = [
        // Empty queryStr
        () => ["", queryStr()],
        // queryStr w/ content
        (key, value) => [
          `<${key}1>${getQuotedEscapedStr(value)}<${key}2> `,
          queryStr(`<${key}1>${getQuotedEscapedStr(value)}<${key}2>`),
        ],
      ];

      const smokeTestChipKeys: Array<
        (
          key: string,
          value: string,
          key2: string,
          value2: string,
        ) => [string, Node]
      > = [
        // Chip w/ empty chipKey
        (key) => [`+<${key}>: `, chip(chipKey(`<${key}>`), chipValue())],
        // Chip w/ empty chipValue
        (key, value) => [
          `+<${key}1>${getQuotedEscapedStr(value)}<${key}2>:<${key}3> `,
          chip(chipKey(`<${key}1>${value}<${key}2>`), chipValue(`<${key}3>`)),
        ],
        // Chip
        (key, value, key2, value2) => [
          `+<${key}1>${getQuotedEscapedStr(value)}<${key}2>:<${key2}1>${getQuotedEscapedStr(value2)}<${key2}2> `,
          chip(
            chipKey(`<${key}1>${value}<${key}2>`),
            chipValue(`<${key2}1>${value2}<${key2}2>`),
          ),
        ],
      ];

      const randomGenerator = pseudoRandom(1);
      for (let specNo = 0; specNo < 1; specNo++) {
        let queryAndPositions = "";
        const docNodes: Node[] = [];
        const specDocLength = 1 + (randomGenerator.next().value % 5);
        for (let docIndex = 0; docIndex < specDocLength; docIndex++) {
          const char = 97 + docIndex * 3;
          const queryIndex =
            randomGenerator.next().value % smokeTestQueryStrs.length;
          const chipKeyIndex =
            randomGenerator.next().value % smokeTestChipKeys.length;

          const [queryStrStr, queryStrNode] = smokeTestQueryStrs[queryIndex](
            String.fromCharCode(char),
            getSmokeTestString(randomGenerator),
          );

          const [chipStr, chipNode] = smokeTestChipKeys[chipKeyIndex](
            String.fromCharCode(char + 1),
            getSmokeTestString(randomGenerator),
            String.fromCharCode(char + 2),
            getSmokeTestString(randomGenerator),
          );

          queryAndPositions += queryStrStr + chipStr;
          docNodes.push(queryStrNode, chipNode);
        }

        const docNode = doc(...docNodes, queryStr());
        try {
          docNode.check();
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
          logNode(docNode);
          throw new Error(
            "Property test created an invalid node — the structure is logged above",
          );
        }

        mappingSpecs.push({
          name: `property test ${specNo} (\`${queryAndPositions}\`)`,
          queryAndPositions,
          doc: doc(...docNodes, queryStr()),
        });
      }

      mappingSpecs.forEach(({ queryAndPositions, doc, name }) => {
        it.only(`should map ${name}`, () => {
          const { query, positions } = getCqlStrPositions(queryAndPositions);
          const tokens = queryToProseMirrorTokens(query);
          const queryStrToDocMapping =
            createProseMirrorTokenToDocumentMapping(tokens);
          const docToQueryStrMapping = queryStrToDocMapping.invert();

          // Sanity check that this equals the text string
          expect(
            docToCqlStr(doc),
            `Expected the doc to match the query spec, minus any position information`,
          ).toBe(query);

          const positionsMappedFromDocToQueryStr: Record<string, number> = {};
          const mappedPositionDebugInfo: Record<
            string,
            { docPos: number; queryPos: number }
          > = {};
          Object.entries(doc.tag).forEach(([docKey, docPos]) => {
            if (positions[docKey] === undefined) {
              throw new Error(`Expected a document position for key ${docKey}`);
            }

            const queryPos = docToQueryStrMapping.map(docPos);

            const remappedDocPos = queryStrToDocMapping.map(queryPos, 1);
            expect(remappedDocPos, `${queryAndPositions} -> ${queryPos} -> ${docKey}${docPos}`).toBe(docPos);
            positionsMappedFromDocToQueryStr[docKey] = queryPos;
            mappedPositionDebugInfo[docKey] = { docPos, queryPos };
          });

          expect(
            positionsMappedFromDocToQueryStr,
            `Mapping didn't match - see the diff. The output for the query \`${query}\`, with positions at \`${queryAndPositions}\` was: ${JSON.stringify(mappedPositionDebugInfo, null, "  ")}`,
          ).toEqual(positions);
        });
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
