import { Mapping, StepMap } from "prosemirror-transform";
import { Decoration, EditorView } from "prosemirror-view";
import {
  DELETE_CHIP_INTENT,
  IS_READ_ONLY,
  chip,
  chipKey,
  chipValue,
  doc,
  schema,
  queryStr,
  POLARITY,
  IS_SELECTED,
} from "./schema";
import { Node, NodeType } from "prosemirror-model";
import {
  NodeSelection,
  Selection,
  TextSelection,
  Transaction,
} from "prosemirror-state";
import {
  CLASS_ERROR,
  CqlError,
  TRANSACTION_IGNORE_READONLY as TRANSACTION_APPLY_SUGGESTION,
  TRANSACTION_IGNORE_READONLY,
} from "./plugins/cql";
import { isChipKey, Token, TokenType } from "../../lang/token";
import {
  MappedTypeaheadSuggestion,
  TypeaheadSuggestion,
} from "../../lang/types";
import { CqlResult, createParser } from "../../lang/Cql";
import { hasWhitespace } from "../../lang/utils";

const tokensToPreserve = [
  TokenType.CHIP_KEY_POSITIVE,
  TokenType.CHIP_KEY_NEGATIVE,
  TokenType.CHIP_VALUE,
  TokenType.EOF,
] as string[];

const joinQueryStrTokens = (tokens: ProseMirrorToken[]) =>
  tokens.reduce((acc, token) => {
    if (tokensToPreserve.includes(token.tokenType)) {
      return acc.concat(token);
    }

    const prevToken = acc.at(-1);

    if (!prevToken || tokensToPreserve.includes(prevToken.tokenType)) {
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

const getCqlFieldKeyRange = (
  from: number,
  hasPrefix: boolean,
): [number, number, number] => {
  // optional leading char ('+') (+1)
  // chipKey begin (-1)
  // chip begin (-1)
  const prefixOffset = hasPrefix ? 1 : 0;
  return [from - 1, -2 + prefixOffset, 0];
};

const getQueryValueRanges = (
  from: number,
  to: number,
  isQuoted: boolean,
): [number, number, number][] => {
  const quoteOffset = isQuoted ? 1 : 0;
  return [
    // chipKey end (-1)
    // chipValue start (-1)
    // leading char (':') (+1)
    [from, -1, 0],
    [from, quoteOffset, 0],
    // chipValue end (-1)
    [to, quoteOffset, 0],
    [to, -1, 0],
  ];
};

const getQueryStrRanges = (
  from: number,
  to: number,
): [number, number, number][] => [
  [from, -1, 0], // queryStr begin (+1)
  // If the queryStr node has content, it will begin with whitespace in the
  // query, which pushes subsequent content forward one position. This cancels
  // out queryStr end (+1), so only add a mapping for the node end if the
  // queryStr node has content.
  //
  // This is a slightly obscure solution to this problem - we could also use the
  // gaps between the token positions and the token literal length to account
  // for this discrepancy, too.
  ...(from === to ? [[to, -1, 0] as [number, number, number]] : []),
];

/**
 * Create a mapping from ProseMirrorToken positions to document positions.
 *
 * This is necessary because whereas a CQL query is one-dimensional (a string),
 * the ProseMirror document is two-dimensional (a tree), although it can be
 * indexed as a flat sequence of tokens (see
 * https://prosemirror.net/docs/guide/#doc.indexing).
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
    (accRanges, { tokenType, from, to, lexeme }, index, tokens) => {
      switch (tokenType) {
        case TokenType.CHIP_KEY_POSITIVE:
        case TokenType.CHIP_KEY_NEGATIVE: {
          // If this field is at the start of the document, or preceded by a
          // field value, the editor will add a queryStr node to conform to
          // the schema, so we add a queryStr mapping to account for the
          // additional node.
          const previousToken = tokens[index - 1];
          const shouldAddQueryStrMapping =
            previousToken?.tokenType === "CHIP_VALUE" || index === 0;
          const hasPrefix = lexeme.startsWith("+") || lexeme.startsWith("-");

          return accRanges.concat(
            ...(shouldAddQueryStrMapping
              ? getQueryStrRanges(previousToken?.to, previousToken?.to)
              : []),
            getCqlFieldKeyRange(from, hasPrefix),
          );
        }
        case "CHIP_VALUE": {
          return accRanges.concat(
            ...getQueryValueRanges(
              from,
              to,
              hasWhitespace(lexeme) ? true : false,
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

  return new Mapping([new StepMap(ranges.flat())]);
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
export const tokensToDoc = (_tokens: ProseMirrorToken[]): Node => {
  const nodes = joinQueryStrTokens(_tokens).reduce<Node[]>(
    (acc, token, index, tokens): Node[] => {
      switch (token.tokenType) {
        case TokenType.CHIP_KEY_POSITIVE:
        case TokenType.CHIP_KEY_NEGATIVE: {
          const tokenKey = token.literal;
          const nextToken = tokens[index + 1];
          const tokenValue =
            nextToken.tokenType === "CHIP_VALUE" ? nextToken.literal : "";
          const previousToken = tokens[index - 1];
          const isPrecededByChip =
            previousToken?.tokenType === "CHIP_VALUE" ||
            isChipKey(previousToken?.tokenType);
          return acc.concat(
            // Insert a string node if two chips are adjacent
            ...(isPrecededByChip ? [queryStr.create()] : []),
            chip.create(
              {
                [POLARITY]:
                  token.tokenType === TokenType.CHIP_KEY_POSITIVE ? "+" : "-",
              },
              [
                chipKey.create(
                  undefined,
                  tokenKey ? schema.text(tokenKey) : undefined,
                ),
                chipValue.create(
                  undefined,
                  tokenValue ? schema.text(tokenValue) : undefined,
                ),
              ],
            ),
          );
        }
        case "EOF": {
          const previousToken = tokens[index - 1];
          const previousNode = acc[acc.length - 1];
          if (
            previousToken?.to < token.from &&
            previousNode.type === queryStr
          ) {
            // If there is a gap between the previous queryStr token and EOF,
            // there is whitespace at the end of the query – preserve one char
            // to allow users to continue the query
            return acc
              .slice(0, acc.length - 1)
              .concat(
                queryStr.create(
                  undefined,
                  schema.text(previousNode.textContent + " "),
                ),
              );
          }

          if (previousNode?.type !== queryStr) {
            // Always end with a queryStr node
            return acc.concat(queryStr.create());
          }

          return acc;
        }
        // All other tokens become queryStr
        default: {
          // Ignore chip values if they are preceded by keys - they will be
          // taken care of in the "CHIP_KEY" case above. If not, interpret them
          // as queryStr, so we can display them as text in the input.
          const previousToken = tokens[index - 1];
          if (
            token.tokenType === "CHIP_VALUE" &&
            isChipKey(previousToken?.tokenType)
          ) {
            return acc;
          }

          // If the next token is further ahead of this token by more than one
          // position, it is separated by whitespace – append the whitespace to
          // this node
          const nextToken = tokens[index + 1];
          const trailingWhitespaceChars = nextToken
            ? Math.max(nextToken?.from - token.to - 1, 0)
            : 0;
          const trailingWhitespace = " ".repeat(trailingWhitespaceChars);

          // If we are at the beginning of our token list and the `from` is not
          // 0, the document begins with whitespace — prepend the whitespace to
          // this node
          const prevToken = tokens[index - 1];
          const leadingWhitespace = " ".repeat(prevToken ? 0 : token.from);

          const previousNode = acc[acc.length - 1];
          if (previousNode?.type === queryStr) {
            // Join consecutive queryStr nodes
            return acc
              .slice(0, acc.length - 1)
              .concat(
                queryStr.create(
                  undefined,
                  schema.text(
                    leadingWhitespace +
                      previousNode.textContent +
                      token.lexeme +
                      trailingWhitespace,
                  ),
                ),
              );
          }

          return acc.concat(
            queryStr.create(
              undefined,
              schema.text(
                leadingWhitespace + token.lexeme + trailingWhitespace,
              ),
            ),
          );
        }
      }
    },
    // Our document always starts with an empty queryStr node
    [queryStr.create()],
  );

  return doc.create(undefined, nodes);
};

const tokensThatAreNotDecorated = ["CHIP_KEY", "CHIP_VALUE", "EOF"];

export const tokensToDecorations = (
  tokens: ProseMirrorToken[],
): Decoration[] => {
  return mapTokens(tokens)
    .filter((token) => !tokensThatAreNotDecorated.includes(token.tokenType))
    .map(({ from, to, tokenType }) =>
      Decoration.inline(
        from,
        to,
        { class: `CqlToken__${tokenType}` },
        { key: `${from}-${to}` },
      ),
    );
};

export const docToCqlStr = (doc: Node): string => {
  let str: string = "";

  doc.descendants((node, _pos, parent) => {
    switch (node.type.name) {
      case "queryStr": {
        str += node.textContent;
        return false;
      }
      case "chipKey": {
        const leadingWhitespace =
          str.trim() === "" || str.endsWith(" ") ? "" : " ";
        const polarity = parent?.attrs[POLARITY];

        // Anticipate a chipValue here, adding the colon – if we do not, and a
        // chipValue is not present, we throw the mappings off.
        str += `${leadingWhitespace}${polarity}${node.textContent}:`;
        return false;
      }
      case "chipValue": {
        const value = node.textContent;

        if (value.trim().length === 0) {
          str += " ";
          return;
        }

        const maybeQuoteMark = hasWhitespace(value) ? '"' : "";
        str += `${maybeQuoteMark}${value}${maybeQuoteMark} `;

        return false;
      }
      default: {
        return true;
      }
    }
  });

  return str;
};

export const findNodeAt = (pos: number, doc: Node, type: NodeType): number => {
  let found = -1;
  doc.nodesBetween(pos - 1, doc.content.size, (node, pos) => {
    if (found > -1) return false;

    if (node.type === type) {
      found = pos;
    }
  });
  return found;
};

/**
 * Return a selection pointing into a chipKey if the current selection precedes
 * or is just within a chip.
 */
export const maybeMoveSelectionIntoChipKey = ({
  selection,
  prevDoc,
  currentDoc,
}: {
  selection: Selection;
  prevDoc: Node;
  currentDoc: Node;
}): Selection => {
  const defaultSelection = TextSelection.near(
    currentDoc.resolve(Math.min(selection.from, currentDoc.nodeSize - 2)),
  );

  if (selection.from > currentDoc.nodeSize || selection.from !== selection.to) {
    return defaultSelection;
  }

  let nodeTypeToMoveTo: NodeType | undefined;
  if (
    selection.from === selection.to &&
    selection.$from.node().type === queryStr &&
    prevDoc.textBetween(selection.from - 1, selection.from) === ":"
  ) {
    nodeTypeToMoveTo = chipValue;
  } else {
    const $from = currentDoc.resolve(selection.from);
    const nodeAtCurrentSelection = $from.node().type;
    const nodeTypeAfterCurrentSelection = $from.nodeAfter?.type;
    const shouldWrapSelectionInKey =
      // Is the selection just before the start of a chip?
      nodeAtCurrentSelection === chip || nodeTypeAfterCurrentSelection === chip;
    if (shouldWrapSelectionInKey) {
      nodeTypeToMoveTo = chipKey;
    }
  }

  if (nodeTypeToMoveTo) {
    const nodePos = findNodeAt(selection.from, currentDoc, nodeTypeToMoveTo);

    if (nodePos !== -1) {
      const $pos = currentDoc.resolve(nodePos);
      const selection = TextSelection.near($pos, 1);
      if (selection) {
        return selection;
      }
    }
  }

  return defaultSelection;
};

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
  mapping: Mapping,
) =>
  typeaheadSuggestions.map((suggestion) => {
    const from = mapping.map(suggestion.from);
    const to = mapping.map(suggestion.to + 1, -1);
    return { ...suggestion, from, to } as MappedTypeaheadSuggestion;
  });

const toMappedError = (error: CqlError, mapping: Mapping) => ({
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
const typeaheadSelectionSequence = [chipKey, chipValue, queryStr];

export const getNextPositionAfterTypeaheadSelection = (
  currentDoc: Node,
  currentPos: number,
) => {
  const $pos = currentDoc.resolve(currentPos);
  const suggestionNode = $pos.node();
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
  currentDoc.nodesBetween(currentPos, currentDoc.nodeSize - 2, (node, pos) => {
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

/**
 * Apply a delete intent to the node at the given range:
 *  - mark the node for deletion, or
 *  - delete the node if already marked for deletion
 */
export const applyDeleteIntent = (
  view: EditorView,
  from: number,
  to: number,
  node: Node,
) => {
  if (node.type !== chip) {
    return false;
  }

  const tr = view.state.tr;

  if (node.attrs[DELETE_CHIP_INTENT]) {
    // The caret belongs before the deleted chip
    removeChipCoveringRange(from, to, tr);
  } else {
    tr.setNodeAttribute(from, DELETE_CHIP_INTENT, true);
  }

  view.dispatch(tr);

  return true;
};

export const errorToDecoration = (position: number): Decoration => {
  const toDOM = () => {
    const el = document.createElement("span");
    el.classList.add(CLASS_ERROR);
    return el;
  };

  return Decoration.widget(position, toDOM);
};

export const queryHasChanged = (
  oldDoc: Node,
  newDoc: Node,
): { prevQuery: string; currentQuery: string } | undefined => {
  if (oldDoc === newDoc) {
    return;
  }

  const prevQuery = docToCqlStr(oldDoc);
  const currentQuery = docToCqlStr(newDoc);

  return prevQuery !== currentQuery ? { prevQuery, currentQuery } : undefined;
};

export const getNodeTypeAtSelection = (view: EditorView) => {
  const {
    doc,
    selection: { from },
  } = view.state;
  return doc.resolve(from).node().type;
};

/**
 * Applies chip lifecycle rules:
 *
 * - chip keys are readonly unless a selection points into them explicitly
 * - chip values are readonly until their sibling chip key has a value
 * - chips that do not contain any values, nor a selection, are removed
 */
export const applyChipLifecycleRules = (tr: Transaction): void => {
  const { from, to } = tr.selection;
  tr.doc.descendants((node, pos) => {
    switch (node.type) {
      case chip: {
        const keyNode = node.maybeChild(0);

        if (!keyNode) {
          return;
        }

        const keyNodeStart = pos + 1;
        const keyNodeEnd = keyNodeStart + keyNode.nodeSize;
        const selectionCoversChipKey = from >= keyNodeStart && to <= keyNodeEnd;
        const chipKeyHasContent = !!keyNode.textContent;

        const { node: valueNode, offset } = node.childBefore(node.nodeSize - 2);

        if (!valueNode) {
          return;
        }

        const valueNodeStart = pos + offset + 1;

        if (!selectionCoversChipKey && chipKeyHasContent) {
          tr.setNodeAttribute(
            keyNodeStart,
            IS_READ_ONLY,
            true,
          ).setNodeAttribute(valueNodeStart, IS_READ_ONLY, false);
        }

        return false;
      }
    }
  });
};

export const applySuggestion =
  (view: EditorView) => (from: number, to: number, value: string) => {
    const tr = view.state.tr;

    tr.replaceRangeWith(from, to, schema.text(value)).setMeta(
      TRANSACTION_APPLY_SUGGESTION,
      true,
    );

    const insertPos = getNextPositionAfterTypeaheadSelection(tr.doc, to);

    if (insertPos) {
      tr.setSelection(TextSelection.create(tr.doc, insertPos));
    }

    view.dispatch(tr);
    view.focus();

    return true;
  };

export const skipSuggestion = (view: EditorView) => () => {
  const tr = view.state.tr;
  const insertPos = getNextPositionAfterTypeaheadSelection(
    tr.doc,
    tr.selection.from,
  );

  if (insertPos) {
    tr.setSelection(TextSelection.create(tr.doc, insertPos)).setMeta(
      TRANSACTION_IGNORE_READONLY,
      true,
    );
  }
  view.dispatch(tr);
  view.focus();

  return true;
};

export const isChipSelected = (node: Node) => node.attrs[IS_SELECTED] === true;

/**
 * If the selection is entirely within the node(s) of the given type, return the
 * node.
 */
export const isSelectionWithinNodesOfType = (
  doc: Node,
  selection: Selection,
  nodeTypes: NodeType[],
): Node | undefined => {
  if (
    selection instanceof NodeSelection &&
    nodeTypes.includes(selection.node.type)
  ) {
    return selection.node;
  }

  const { from, to } = selection;

  const $from = doc.resolve(from);
  const $to = doc.resolve(to);
  const fromNode = $from.node();
  const toNode = $to.node();
  if (fromNode !== toNode) {
    return;
  }

  return nodeTypes.includes(fromNode.type) ? fromNode : undefined;
};

const removeChipCoveringRange = (from: number, to: number, tr: Transaction) => {
  const insertAt = Math.max(0, from - 1);
  tr.deleteRange(from, to);

  // If the document has content, ensure whitespace separates the two queryStr
  // nodes surrounding the chip, which are now joined.
  if (tr.doc.textContent) {
    tr.setSelection(
      TextSelection.near(tr.doc.resolve(insertAt), -1),
    ).insertText(" ");
  }
};

/**
 * Remove the chip at the current selection if:
 *   - the selection is within a key, and the key is empty
 *   - the selection is within a value, and the value is empty
 * @return true if a chip is removed, false if not.
 */
export const removeChipAtSelectionIfEmpty = (view: EditorView) => {
  const { doc, selection } = view.state;

  if (isSelectionWithinNodesOfType(doc, selection, [chipKey, chipValue])) {
    const $pos = doc.resolve(selection.from);
    const nodeAtSelection = $pos.node();
    if (!nodeAtSelection.textContent) {
      const $chipPos = doc.resolve($pos.before(1));
      const chipNode = $chipPos.nodeAfter;
      if (!chipNode || chipNode.type !== chip) {
        return;
      }
      const tr = view.state.tr;
      removeChipCoveringRange(
        $chipPos.pos,
        $chipPos.pos + chipNode.nodeSize,
        tr,
      );
      view.dispatch(tr);
      return true;
    }
  }
  return false;
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
):
  | { type: "TEXT"; content: string }
  | { type: "HTML"; content: string }
  | undefined => {
  const maybeHtml = event.clipboardData?.getData("text/html");
  if (maybeHtml) {
    const element = document.createElement("div");
    element.innerHTML = maybeHtml;
    const isNativeProseMirrorContent = !!element.querySelector("query-str");
    if (isNativeProseMirrorContent) {
      return { type: "HTML", content: element.innerText };
    }

    return { type: "TEXT", content: element.innerText };
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
