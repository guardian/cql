import { Leaf, Node, Plot } from "wordgard/doc";
import { GardSelection, GardState } from "wordgard/state";
import {
  chipKey,
  chipValue,
  chipType,
  chipKeyTag,
  chipValueTag,
  queryStr,
  queryStrTag,
  schema,
  selectedMark,
} from "./schema";
import { CqlError } from "./plugins/cql";
import { isChipKey, Token, TokenType } from "../../lang/token";
import {
  MappedTypeaheadSuggestion,
  TypeaheadSuggestion,
} from "../../lang/types";
import { CqlResult, createParser } from "../../lang/Cql";
import {
  escapeQuotes,
  shouldQuoteFieldValue,
  unescapeQuotes,
} from "../../lang/utils";

/**
 * A lightweight position map from CQL-query-string coordinates to editor
 * document coordinates.
 *
 * ProseMirror shipped `StepMap`/`Mapping` primitives that could be used as a
 * standalone coordinate transform, independent of any real document change.
 * Wordgard's only position-mapping primitive, `ChangeSet`, is bound to a
 * concrete document (it validates against the document length and must
 * describe a well-formed edit), so it cannot represent the synthetic
 * string -> tree mapping this module relies on.
 *
 * `PosMapper` therefore reimplements ProseMirror's `StepMap.map` semantics
 * over a flat array of `[start, oldSize, newSize]` triples, preserving the
 * exact mapping behaviour the previous implementation depended on.
 */
export class PosMapper {
  constructor(private readonly ranges: readonly number[]) {}

  /**
   * Map a position. `assoc` (defaulting to `1`) decides which way the position
   * sticks when content is inserted exactly at it: `-1` stays before the
   * inserted content, `1` moves after it.
   */
  map(pos: number, assoc: number = 1): number {
    let diff = 0;
    for (let i = 0; i < this.ranges.length; i += 3) {
      const start = this.ranges[i];
      if (start > pos) break;
      const oldSize = this.ranges[i + 1];
      const newSize = this.ranges[i + 2];
      const end = start + oldSize;
      if (pos <= end) {
        const side = !oldSize
          ? assoc
          : pos === start
            ? -1
            : pos === end
              ? 1
              : assoc;
        return start + diff + (side < 0 ? 0 : newSize);
      }
      diff += newSize - oldSize;
    }
    return pos + diff;
  }

  /**
   * Return a `PosMapper` that maps positions in the opposite direction, i.e.
   * from the mapped (document) coordinate space back to the original (query)
   * coordinate space. Mirrors ProseMirror's `StepMap.invert`.
   */
  invert(): PosMapper {
    const inverted: number[] = [];
    let diff = 0;
    for (let i = 0; i < this.ranges.length; i += 3) {
      const start = this.ranges[i];
      const oldSize = this.ranges[i + 1];
      const newSize = this.ranges[i + 2];
      inverted.push(start + diff, newSize, oldSize);
      diff += newSize - oldSize;
    }
    return new PosMapper(inverted);
  }
}

const tokensToPreserve = [
  TokenType.CHIP_KEY,
  TokenType.CHIP_VALUE,
  TokenType.EOF,
] as string[];

const isPolarityToken = (token: ProseMirrorToken) =>
  ([TokenType.PLUS, TokenType.MINUS] as string[]).includes(token.tokenType);

const isChipToken = (token: ProseMirrorToken) =>
  ([TokenType.CHIP_KEY, TokenType.CHIP_VALUE] as string[]).includes(
    token.tokenType,
  );

export const joinQueryStrTokens = (tokens: ProseMirrorToken[]) =>
  tokens.reduce((acc, token, index) => {
    if (tokensToPreserve.includes(token.tokenType)) {
      return acc.concat(token);
    }

    const prevToken = acc.at(-1);
    const nextToken = tokens[index + 1];

    const shouldPreserveToken =
      !!prevToken &&
      (tokensToPreserve.includes(prevToken?.tokenType) ||
        (!!nextToken && isPolarityToken(token) && isChipToken(nextToken)));
    if (!prevToken || shouldPreserveToken) {
      return acc.concat(token);
    }

    const padLength = token.from - prevToken.from;

    return acc.slice(0, acc.length - 1).concat({
      ...token,
      from: prevToken.from,
      tokenType: "STRING",
      literal: undefined,
      lexeme: prevToken.lexeme.padEnd(padLength, " ") + token.lexeme,
    });
  }, [] as ProseMirrorToken[]);

const getFieldKeyRange = (
  from: number,
  to: number,
  isQuoted: boolean,
  isFollowedByEmptyValue: boolean,
): [number, number, number][] => {
  const quoteOffset = isQuoted ? 1 : 0;
  const emptyValueOffset = isFollowedByEmptyValue ? 1 : 0;
  return [
    // chip begin (-1)
    // chipKey begin (-1)
    [from, 0, 2],
    // maybe start quote (+1 to remove from str)
    [from, quoteOffset, 0],
    // maybe end quote (+1 to remove from str)
    // offset `:` into chipValue (+1 to node)
    [to - 1, quoteOffset, 1 + emptyValueOffset],
  ];
};

const getFieldValueRanges = (
  from: number,
  to: number,
  isQuoted: boolean,
): [number, number, number][] => {
  const quoteOffset = isQuoted ? 1 : 0;

  return [
    // chipKey end, chipValue start (-1)
    // remove offset from `:`
    // maybe start quote
    [from, 1 + quoteOffset, 1],
    // chipValue end (-1)
    // maybe end quote (+1)
    [to, quoteOffset, 1],
  ];
};

const getQueryStrRanges = (
  from: number,
  to: number,
): [number, number, number][] => [
  [from, -1, 0], // queryStr begin (+1)
  // If the queryStr node has content, it will begin with whitespace in the
  // query, which pushes subsequent content forward one position. This cancels
  // out queryStr end (-1), so only add a mapping for the node end if the
  // queryStr node has content.
  //
  // This is a slightly obscure solution to this problem - we could also use the
  // gaps between the token positions and the token literal length to account
  // for this discrepancy, too.
  ...(from === to ? [[to, -1, 0] as [number, number, number]] : []),
];

const polarityRanges = (from: number): [number, number, number] => [
  from - 1,
  1,
  0,
];

const maybeQueryStrRanges = (
  token: ProseMirrorToken | undefined,
  index: number,
) => {
  // If this field is at the start of the document, or preceded by a
  // field value, the editor will add a queryStr node to conform to
  // the schema, so we add a queryStr mapping to account for the
  // additional node.

  const shouldAddQueryStrMapping =
    token?.tokenType === "CHIP_VALUE" || index === 0;
  const queryStrFrom = token ? token?.to + 1 : 0;
  return shouldAddQueryStrMapping
    ? getQueryStrRanges(queryStrFrom, queryStrFrom)
    : [];
};

/**
 * Create a mapping from ProseMirrorToken positions to document positions.
 *
 * This is necessary because whereas a CQL query is one-dimensional (a string),
 * the ProseMirror document is two-dimensional (a tree), indexed as a flat
 * sequence of tokens (see https://prosemirror.net/docs/guide/#doc.indexing).
 *
 * For example, the following CQL string (after conversion to ProseMirror ranges
 * – see `toProseMirrorTokens`)
 *
 *  s t r   + k : v
 * | | | | | | | | |
 * 0 1 2 3 4 5 6 7 8
 *
 * is represented in ProseMirror as
 *
 *  <doc> <queryStr> s t r </queryStr> <chipWrapper> <chip> <chipKey> k </chipKey> <chipValue> v </chipValue> </chip> </chipWrapper> </doc>
 * |     |          | | | |           |             |      |         | |          |           | |            |       |              |      |
 * 0     1          2 3 4 5           6             7      8         9 10         11         12 13           14      15             16     17
 *
 * NB: This function will not fill out the queryStr at the beginning or end of
 * the document, relying on ProseMirror's schema to autofill missing nodes.
 */
export const createProseMirrorTokenToDocumentMap = (
  tokens: ProseMirrorToken[],
) => {
  // We only distinguish between key/val tokens here – other tokens are universally
  // represented as queryStr. We join the other tokens into single ranges so we
  // can provide mappings for their node representation.
  const compactedTokenRanges = joinQueryStrTokens(tokens);

  const ranges = compactedTokenRanges.reduce<[number, number, number][]>(
    (accRanges, { tokenType, from, to, literal }, index, tokens) => {
      const previousToken = tokens[index - 1] as ProseMirrorToken | undefined;

      switch (tokenType) {
        case TokenType.PLUS:
        case TokenType.MINUS: {
          return accRanges.concat([
            ...maybeQueryStrRanges(previousToken, index),
            polarityRanges(from),
          ]);
        }
        case TokenType.CHIP_KEY: {
          const isFollowedByFieldValueToken =
            tokens[index + 1]?.tokenType === "CHIP_VALUE";
          return accRanges.concat(
            ...maybeQueryStrRanges(previousToken, index),
            getFieldKeyRange(
              from,
              to,
              shouldQuoteFieldValue(literal ?? ""),
              !isFollowedByFieldValueToken,
            ),
          );
        }
        case TokenType.CHIP_VALUE: {
          return accRanges.concat(
            ...getFieldValueRanges(
              from,
              to,
              shouldQuoteFieldValue(literal ?? ""),
            ),
          );
        }
        default: {
          return accRanges.concat(...getQueryStrRanges(from, to));
        }
      }
    },
    [],
  );

  return new PosMapper(ranges.flat());
};

/**
 * Map ProseMirrorTokens to their document positions.
 */
export const mapTokens = (tokens: ProseMirrorToken[]): ProseMirrorToken[] => {
  const mapping = createProseMirrorTokenToDocumentMap(tokens);

  return tokens.map(({ from, to, ...rest }) => ({
    from: mapping.map(from),
    to: mapping.map(to, -1),
    ...rest,
  }));
};

/**
 * Create a ProseMirror document from an array of ProseMirrorTokens.
 */
export const tokensToDoc = (_tokens: ProseMirrorToken[]): Plot.Doc => {
  const leadingWhitespaceCount = _tokens[0]?.from ?? 0;
  const leadingNodeContent =
    leadingWhitespaceCount > 0
      ? Leaf.text(" ".repeat(leadingWhitespaceCount))
      : null;

  // Our document always starts with an empty queryStr node that accounts for
  // any leading whitespace
  const initialContent = [
    queryStrTag.create(leadingNodeContent ? [leadingNodeContent] : []),
  ];

  const { nodes } = joinQueryStrTokens(_tokens).reduce<{
    nodes: Node[];
    inNegatedExpr?: true;
  }>(
    (
      { nodes, inNegatedExpr },
      token,
      index,
      tokens,
    ): { nodes: Node[]; inNegatedExpr?: true } => {
      const previousToken = tokens[index - 1];
      switch (token.tokenType) {
        case TokenType.PLUS:
        case TokenType.MINUS:
        case TokenType.CHIP_KEY: {
          const isPrecededByChipValue =
            previousToken?.tokenType === TokenType.CHIP_VALUE;

          // Insert a string node if two chips are adjacent
          const maybePrecedingQueryStr = isPrecededByChipValue
            ? [queryStrTag.create()]
            : [];

          switch (token.tokenType) {
            case TokenType.PLUS: {
              return { nodes: nodes.concat(maybePrecedingQueryStr) };
            }
            case TokenType.MINUS: {
              return {
                nodes: nodes.concat(maybePrecedingQueryStr),
                inNegatedExpr: true,
              };
            }
            case TokenType.CHIP_KEY: {
              const tokenKey = token.literal;
              const nextToken = tokens[index + 1];
              const tokenValue =
                nextToken.tokenType === "CHIP_VALUE" ? nextToken.literal : "";

              return {
                nodes: nodes.concat(
                  maybePrecedingQueryStr,
                  chipType.of(inNegatedExpr ? "-" : "+").create([
                    chipKeyTag.create(
                      tokenKey ? [Leaf.text(unescapeQuotes(tokenKey))] : [],
                    ),
                    chipValueTag.create(
                      tokenValue
                        ? [Leaf.text(unescapeQuotes(tokenValue))]
                        : [],
                    ),
                  ]),
                ),
              };
            }
          }
        }
        // @eslint-ignore no-fallthrough - typescript thinks the above statement
        // cannot fall through, and I trust Typescript over ESLint
        case "EOF": {
          const previousNode = nodes[nodes.length - 1];
          if (
            previousToken?.to < token.from &&
            previousNode.type === queryStr
          ) {
            // If there is a gap between the previous queryStr token and EOF,
            // there is whitespace at the end of the query – preserve one char
            // to allow users to continue the query
            return {
              nodes: nodes
                .slice(0, nodes.length - 1)
                .concat(
                  queryStrTag.create([
                    Leaf.text((previousNode as Plot).textContent() + " "),
                  ]),
                ),
            };
          }

          if (previousNode?.type !== queryStr) {
            // Always end with a queryStr node
            return {
              nodes: nodes.concat(queryStrTag.create()),
            };
          }

          return { nodes };
        }
        // All other tokens become queryStr
        default: {
          // Ignore chip values if they are preceded by keys - they will be
          // taken care of in the "CHIP_KEY" case above. If not, interpret them
          // as queryStr, so we can display them as text in the input.
          if (
            token.tokenType === "CHIP_VALUE" &&
            isChipKey(previousToken?.tokenType)
          ) {
            return { nodes };
          }

          // If the next token is further ahead of this token by more than one
          // position, it is separated by whitespace – append the whitespace to
          // this node
          const nextToken = tokens[index + 1];
          const trailingWhitespaceChars = nextToken
            ? Math.max(nextToken?.from - token.to - 1, 0)
            : 0;
          const trailingWhitespace = " ".repeat(trailingWhitespaceChars);
          const lexeme = token.lexeme;

          const previousNode = nodes[nodes.length - 1];
          if (previousNode?.type === queryStr) {
            // Join consecutive queryStr nodes
            return {
              nodes: nodes
                .slice(0, nodes.length - 1)
                .concat(
                  queryStrTag.create([
                    Leaf.text(
                      (previousNode as Plot).textContent() +
                        lexeme +
                        trailingWhitespace,
                    ),
                  ]),
                ),
            };
          }

          return {
            nodes: nodes.concat(
              queryStrTag.create([Leaf.text(lexeme + trailingWhitespace)]),
            ),
          };
        }
      }
    },
    { nodes: initialContent },
  );

  return schema.doc(nodes);
};

const tokensThatAreNotDecorated = ["CHIP_KEY", "CHIP_VALUE", "EOF"];
export const getTokenTestId = (tokenType: ProseMirrorToken["tokenType"]) =>
  `token-${tokenType}`;

export type TokenDecoration = {
  from: number;
  to: number;
  tokenType: ProseMirrorToken["tokenType"];
};

/**
 * Produce the positioned syntax-highlight decorations for a set of tokens.
 *
 * Unlike ProseMirror, wordgard decorations are supplied to the editor through
 * range/point decoration *source* facets (see `Decoration.Range.source`), and
 * the position of a range decoration lives in the `RangeSet` that holds it,
 * not on the decoration itself. This helper therefore returns positioned,
 * plugin-agnostic data; the CQL plugin builds the `RangeSet` from it.
 */
export const tokensToDecorations = (
  tokens: ProseMirrorToken[],
): TokenDecoration[] => {
  return mapTokens(tokens)
    .filter((token) => !tokensThatAreNotDecorated.includes(token.tokenType))
    .map(({ from, to, tokenType }) => ({ from, to, tokenType }));
};

export const docToCqlStr = (doc: Plot.Doc): string => {
  let str: string = "";

  doc.iterate((node, _pos, parent) => {
    switch (node.type.name) {
      case "queryStr": {
        str += (node as Plot).textContent();
        return false;
      }
      case "chipKey": {
        const value = (node as Plot).textContent();
        const leadingWhitespace =
          str.trim() === "" || str.endsWith(" ") ? "" : " ";
        const polarity = parent?.tag.param as string | undefined;

        const maybeQuoteMark = shouldQuoteFieldValue(value) ? '"' : "";
        // Anticipate a chipValue here, adding the colon – if we do not, and a
        // chipValue is not present, we throw the mappings off.
        str += `${leadingWhitespace}${polarity}${maybeQuoteMark}${escapeQuotes(value)}${maybeQuoteMark}:`;
        return false;
      }
      case "chipValue": {
        const value = (node as Plot).textContent();

        if (value.trim().length === 0) {
          str += " ";
          return;
        }

        const maybeQuoteMark = shouldQuoteFieldValue(value) ? '"' : "";

        str += `${maybeQuoteMark}${escapeQuotes(value)}${maybeQuoteMark} `;

        return false;
      }
      default: {
        return true;
      }
    }
  });

  return str;
};

/**
 * Find a node at or after the given position, searching forwards until a node
 * is found.
 */
export const findNodeAt = (
  pos: number,
  doc: Plot.Doc,
  type: Node.Type,
): number => {
  let found = -1;

  doc.iterate(Math.max(pos - 1, 0), doc.length, (node, nodePos) => {
    if (found > -1) return false;

    if (node.type === type) {
      found = nodePos;
    }
  });
  return found;
};

// TODO(wordgard): `maybeMoveSelectionIntoChipKey` is migrated with the CQL
// plugin, where a `GardSelection.Context` (from the editor state) is available
// to normalise a raw position into a valid cursor via `GardSelection.near`.

export type ProseMirrorToken = Omit<Token, "start" | "end"> & {
  from: number;
  to: number;
};

/**
 * CQL ranges correspond to character indices, e.g.
 * a b c
 * 0 1 2
 *
 * Prosemirror positions are positions between characters, e.g.
 *
 *  a b c
 * 0 1 2 3
 */
export const toProseMirrorTokens = (tokens: Token[]): ProseMirrorToken[] =>
  tokens.map(({ start, end, ...token }) => ({
    ...token,
    from: start,
    to: end + 1,
  }));

export const toMappedSuggestions = (
  typeaheadSuggestions: TypeaheadSuggestion[],
  mapping: PosMapper,
) =>
  typeaheadSuggestions.map((suggestion) => {
    const from = mapping.map(suggestion.from);
    const to = mapping.map(
      suggestion.to + 1,
      suggestion.position === "chipKey" ? -1 : 0,
    );

    return { ...suggestion, from, to } as MappedTypeaheadSuggestion;
  });

const toMappedError = (error: CqlError, mapping: PosMapper) => ({
  message: error.message,
  position: error?.position ? mapping.map(error.position) : undefined,
});

export const mapResult = (result: CqlResult) => {
  const tokens = toProseMirrorTokens(result.tokens);
  const mapping = createProseMirrorTokenToDocumentMap(tokens);
  const error = result.error && toMappedError(result.error, mapping);

  return {
    ...result,
    tokens,
    error,
    mapping,
  };
};

// The sequences of nodes to move the caret to after a typeahead selection is
// made, e.g. when a typeahead value is inserted for a chipKey, move the caret
// to the next chipValue.
const typeaheadSelectionSequence: Node.Type[] = [chipKey, chipValue, queryStr];

export const getNextPositionAfterTypeaheadSelection = (
  currentDoc: Plot.Doc,
  currentPos: number,
) => {
  const $pos = currentDoc.resolve(currentPos);
  const suggestionNode = $pos.parent.node;
  const nodeTypeAfterIndex = typeaheadSelectionSequence.indexOf(
    suggestionNode.type,
  );

  if (nodeTypeAfterIndex === -1) {
    console.warn(
      `Attempted to find a selection, but the position ${currentPos} w/in node ${suggestionNode.type.name} is not one of ${typeaheadSelectionSequence.map((_) => _.name).join(",")}`,
    );
    return;
  }

  const nodeTypeToSelect = typeaheadSelectionSequence[nodeTypeAfterIndex + 1];

  if (!nodeTypeToSelect) {
    console.warn(
      `Attempted to find a selection, but the position ${currentPos} w/in node ${suggestionNode.type.name} does not have anything to follow a node of type ${nodeTypeAfterIndex}`,
    );
    return;
  }

  let insertPos: number | undefined;
  currentDoc.iterate(currentPos, currentDoc.length, (node, pos) => {
    if (insertPos !== undefined) {
      return false;
    }

    if (node.type === nodeTypeToSelect) {
      insertPos = pos + 1;
    }
  });

  if (insertPos === undefined) {
    console.warn(
      `Attempted to find a selection after node ${suggestionNode.type.name} at ${$pos.pos}, but could not find a node of type ${nodeTypeToSelect.name}`,
    );
    return;
  }

  return insertPos;
};

// TODO(wordgard): `errorToDecoration` is migrated with the CQL plugin, where
// error markers are provided through the `Decoration.Point.source` facet.

export const queryHasChanged = (
  oldDoc: Plot.Doc,
  newDoc: Plot.Doc,
): { prevQuery: string; currentQuery: string } | undefined => {
  if (oldDoc === newDoc) {
    return;
  }

  const prevQuery = docToCqlStr(oldDoc);
  const currentQuery = docToCqlStr(newDoc);

  return prevQuery !== currentQuery ? { prevQuery, currentQuery } : undefined;
};

export const getNodeTypeAtSelection = (state: GardState) => {
  const {
    doc,
    selection: { from },
  } = state;
  return doc.resolve(from).parent.node.type;
};

// TODO(wordgard): `applyChipLifecycleRules` is migrated with the CQL plugin as
// a `Transaction.appender`. Read-only state is now the `readOnlyMark`, and
// empty chips are removed, via a returned `Transaction.Spec` rather than by
// mutating a transaction in place.
//   - chip keys are readonly unless a selection points into them explicitly
//   - chip values are readonly until their sibling chip key has a value
//   - chips that contain no value, nor a selection, are removed

// TODO(wordgard): `applySuggestion`, `handleEnter` and `skipSuggestionAndFocus`
// dispatch transactions and move the selection. In wordgard these become
// commands returning a `Transaction.Spec` dispatched via the `Wordgard`
// instance; migrated with the CQL plugin/commands.

export const isChipSelected = (node: Node) =>
  node.mark(selectedMark.type) !== undefined;

/**
 * If the selection is entirely within the node(s) of the given type, return the
 * node.
 */
export const isSelectionWithinNodesOfType = (
  doc: Plot.Doc,
  selection: GardSelection,
  nodeTypes: Node.Type[],
): Node | undefined => {
  if (
    selection instanceof GardSelection.Node &&
    nodeTypes.includes(selection.node.type)
  ) {
    return selection.node;
  }

  const { from, to } = selection;

  const fromNode = doc.resolve(from).parent.node;
  const toNode = doc.resolve(to).parent.node;
  if (fromNode !== toNode) {
    return;
  }

  return nodeTypes.includes(fromNode.type) ? fromNode : undefined;
};

export const queryToProseMirrorDoc = (
  query: string,
  parser: ReturnType<typeof createParser>,
) => {
  const result = parser(query);
  const { tokens } = mapResult(result);
  return tokensToDoc(tokens);
};

/**
 * Get content from a clipboard event.
 *
 * HTML content that's serialised by ProseMirror can be handed back as HTML, to
 * be handled by ProseMirror's native paste behaviour, but HTML content that is
 * actually a plain text query should be parsed by the CQL plugin to ensure that
 * we do the relevant diffing on the incoming content, and preserve selection
 * state.
 *
 * For example, copying what looks like plain text in VSCode populates the
 * `text/html` buffer for the copied string `+tag:type/article` with:
 *
 * <meta charset='utf-8'><div style="color: #cccccc;background-color: #1f1f1f;font-family: Menlo, Monaco, 'Courier New', monospace;font-weight: normal;font-size: 12px;line-height: 18px;white-space: pre;"><div><span style="color: #cccccc;">};</span></div><div><span style="color: #d4d4d4;">+</span><span style="color: #c8c8c8;">tag</span><span style="color: #cccccc;">:</span><span style="color: #9cdcfe;">type</span><span style="color: #d4d4d4;">/</span><span style="color: #9cdcfe;">article</span><span style="color: #cccccc;"> </span></div></div>
 *
 * ... which we treat as plain text.
 */
export const getContentFromClipboard = (
  event: ClipboardEvent,
): { type: "TEXT"; content: string } | { type: "HTML" } | undefined => {
  const maybeHtml = event.clipboardData?.getData("text/html");
  if (maybeHtml) {
    const element = document.createElement("div");
    element.innerHTML = maybeHtml;
    const isNativeProseMirrorContent =
      !!element.querySelector("query-str") || !!element.querySelector("chip");
    if (isNativeProseMirrorContent) {
      return { type: "HTML" };
    }
  }

  const maybeText = event.clipboardData?.getData("text/plain");

  if (!maybeText) {
    return;
  }

  return {
    type: "TEXT",
    content: maybeText,
  };
};

export const selectionIsWithinNodeType = (
  state: GardState,
  nodeType: Node.Type,
) => {
  const { from, to } = state.selection;
  const fromNode = state.doc.resolve(from).parent.node;
  const toNode = state.doc.resolve(to).parent.node;

  return fromNode.type === nodeType && fromNode === toNode;
};
