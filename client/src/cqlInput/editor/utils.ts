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
  searchText,
} from "./schema";
import { Node, NodeType } from "prosemirror-model";
import { Selection, TextSelection, Transaction } from "prosemirror-state";
import { CLASS_ERROR } from "./plugin";
import { Token } from "../../lang/token";
import {
  MappedTypeaheadSuggestion,
  TypeaheadSuggestion,
} from "../../lang/types";
import { CqlResult } from "../../lang/Cql";
import { CqlError } from "../../services/CqlSuggestionService";

const tokensToPreserve = ["CHIP_KEY", "CHIP_VALUE", "EOF"];

const joinSearchTextTokens = (tokens: ProseMirrorToken[]) =>
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

const getCqlFieldKeyRange = (from: number): [number, number, number] =>
  // leading char ('+') (+1)
  // chipKey begin (-1)
  // chip begin (-1)
  // 🤔 Unclear why we need an extra bump when our query field is the first token
  [from - 1, -1, 0];

const getQueryValueRanges = (
  from: number,
  to: number
): [number, number, number][] => [
  // chipKey end (-1)
  // chipValue start (-1)
  // leading char (':') (+1)
  [from, -1, 0],
  // chipValue end (-1)
  [to, -1, 0],
];

const getSearchTextRanges = (
  from: number,
  to: number
): [number, number, number][] => [
  [from, -1, 0], // searchText begin (+1)
  // If the searchText node has content, it will begin with whitespace in the
  // query, which pushes subsequent content forward one position. This cancels
  // out searchText end (+1), so only add a mapping for the node end if the
  // searchText node has content.
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
 *  <doc> <searchText> s t r </searchText> <chipWrapper> <chip> <chipKey> k </chipKey> <chipValue> v </chipValue> </chip> </chipWrapper> </doc>
 * |     |            | | | |             |             |      |         | |          |           | |            |       |              |      |
 * 0     1            2 3 4 5             6             7      8         9 10         11         12 13           14      15             16     17
 *
 * NB: This function will not fill out the searchText at the beginning or end of
 * the document, relying on ProseMirror's schema to autofill missing nodes.
 */
export const createProseMirrorTokenToDocumentMap = (
  tokens: ProseMirrorToken[]
) => {
  // We only distinguish between key/val tokens here – other tokens are universally
  // represented as searchText. We join the other tokens into single ranges so we
  // can provide mappings for their node representation.
  const compactedTokenRanges = joinSearchTextTokens(tokens);

  const ranges = compactedTokenRanges.reduce<[number, number, number][]>(
    (accRanges, { tokenType, from, to }, index, tokens) => {
      switch (tokenType) {
        case "CHIP_KEY": {
          // If this field is at the start of the document, or preceded by a
          // field value, the editor will add a searchText node to conform to
          // the schema, so we add a searchText mapping to account for the
          // additional node.
          const previousToken = tokens[index - 1];
          const shouldAddSearchTextMapping =
            previousToken?.tokenType === "CHIP_VALUE" || index === 0;

          return accRanges.concat(
            ...(shouldAddSearchTextMapping
              ? getSearchTextRanges(previousToken?.to, previousToken?.to)
              : []),
            getCqlFieldKeyRange(from)
          );
        }
        case "CHIP_VALUE": {
          return accRanges.concat(...getQueryValueRanges(from, to));
        }
        default: {
          return accRanges.concat(...getSearchTextRanges(from, to));
        }
      }
    },
    []
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
  const nodes = joinSearchTextTokens(_tokens).reduce<Node[]>(
    (acc, token, index, tokens): Node[] => {
      switch (token.tokenType) {
        case "CHIP_KEY": {
          const tokenKey = token.literal;
          const nextToken = tokens[index + 1];
          const tokenValue =
            nextToken.tokenType === "CHIP_VALUE" ? nextToken.literal : "";
          const previousToken = tokens[index - 1];
          const isPrecededByChip =
            previousToken?.tokenType === "CHIP_VALUE" ||
            previousToken?.tokenType === "CHIP_KEY";
          return acc.concat(
            ...(isPrecededByChip ? [searchText.create()] : []),

            chip.create(undefined, [
              chipKey.create(
                undefined,
                tokenKey ? schema.text(tokenKey) : undefined
              ),
              chipValue.create(
                undefined,
                tokenValue ? schema.text(tokenValue) : undefined
              ),
            ])
          );
        }
        case "EOF": {
          const previousToken = tokens[index - 1];
          const previousNode = acc[acc.length - 1];
          if (
            previousToken?.to < token.from &&
            previousNode.type === searchText
          ) {
            // If there is a gap between the previous searchText token and EOF,
            // there is whitespace at the end of the query – preserve at most
            // one char to allow users to continue the query
            return acc
              .slice(0, acc.length - 1)
              .concat(
                searchText.create(
                  undefined,
                  schema.text(previousNode.textContent + " ")
                )
              );
          }

          if (previousNode?.type !== searchText) {
            // Always end with a searchText node
            return acc.concat(searchText.create());
          }

          return acc;
        }
        // All other tokens become searchText
        default: {
          // Ignore chip values if they are preceded by keys - they will be
          // taken care of in the "CHIP_KEY" case above. If not, interpret them
          // as searchText, so we can display them as text in the input.
          const previousToken = tokens[index - 1];
          if (
            token.tokenType === "CHIP_VALUE" &&
            previousToken?.tokenType === "CHIP_KEY"
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
          if (previousNode?.type === searchText) {
            // Join consecutive searchText nodes
            return acc
              .slice(0, acc.length - 1)
              .concat(
                searchText.create(
                  undefined,
                  schema.text(
                    leadingWhitespace +
                      previousNode.textContent +
                      token.lexeme +
                      trailingWhitespace
                  )
                )
              );
          }

          return acc.concat(
            searchText.create(
              undefined,
              schema.text(leadingWhitespace + token.lexeme + trailingWhitespace)
            )
          );
        }
      }
    },
    // Our document always starts with an empty searchText node
    [searchText.create()]
  );

  return doc.create(undefined, nodes);
};

const tokensThatAreNotDecorated = ["CHIP_KEY", "CHIP_VALUE", "EOF"];

export const tokensToDecorations = (
  tokens: ProseMirrorToken[]
): Decoration[] => {
  return mapTokens(tokens)
    .filter((token) => !tokensThatAreNotDecorated.includes(token.tokenType))
    .map(({ from, to, tokenType }) =>
      Decoration.inline(
        from,
        to,
        { class: `CqlToken__${tokenType}` },
        { key: `${from}-${to}` }
      )
    );
};

export const docToCqlStr = (doc: Node) => {
  let str: string = "";

  doc.descendants((node) => {
    switch (node.type.name) {
      case "searchText": {
        str += node.textContent;
        return false;
      }
      case "chipKey": {
        const leadingWhitespace =
          str.trim() === "" || str.endsWith(" ") ? "" : " ";
        // Anticipate a chipValue here, adding the colon – if we do not, and a
        // chipValue is not present, we throw the mappings off.
        str += `${leadingWhitespace}+${node.textContent}:`;
        return false;
      }
      case "chipValue": {
        str +=
          node.textContent.trim().length > 0 ? `${node.textContent} ` : " ";
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
  currentDoc,
}: {
  selection: Selection;
  currentDoc: Node;
}): Selection => {
  const $from = currentDoc.resolve(selection.from);
  const nodeAtCurrentSelection = $from.node().type;
  const nodeTypeAfterCurrentSelection = $from.nodeAfter?.type;
  const shouldWrapSelectionInKey =
    selection.from === selection.to &&
    // Is the selection just before the start of a chip?
    (nodeAtCurrentSelection === chip || nodeTypeAfterCurrentSelection === chip);

  if (shouldWrapSelectionInKey) {
    const nodePos = findNodeAt(selection.from, currentDoc, chipKey);

    if (nodePos !== -1) {
      const $pos = currentDoc.resolve(nodePos);
      const selection = TextSelection.near($pos, 1);
      if (selection) {
        return selection;
      }
    }
  }

  return TextSelection.create(
    currentDoc,
    Math.min(selection.from, currentDoc.nodeSize - 2),
    Math.min(selection.to, currentDoc.nodeSize - 2)
  );
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
  mapping: Mapping
) =>
  typeaheadSuggestions.map((suggestion) => {
    const from = mapping.map(suggestion.from);
    const to = mapping.map(suggestion.to + 1, -1);
    return { ...suggestion, from, to } as MappedTypeaheadSuggestion;
  });

export const toMappedError = (error: CqlError, mapping: Mapping) => ({
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
const typeaheadSelectionSequence = [chipKey, chipValue, searchText];

export const getNextPositionAfterTypeaheadSelection = (
  currentDoc: Node,
  currentPos: number
) => {
  const $pos = currentDoc.resolve(currentPos);
  const suggestionNode = $pos.node();
  const nodeTypeAfterIndex = typeaheadSelectionSequence.indexOf(
    suggestionNode.type
  );

  if (nodeTypeAfterIndex === -1) {
    console.warn(
      `Attempted to find a selection, but the position ${currentPos} w/in node ${suggestionNode.type.name} is not one of ${typeaheadSelectionSequence.map((_) => _.name).join(",")}`
    );
    return;
  }

  const nodeTypeToSelect = typeaheadSelectionSequence[nodeTypeAfterIndex + 1];

  if (!nodeTypeToSelect) {
    console.warn(
      `Attempted to find a selection, but the position ${currentPos} w/in node ${suggestionNode.type.name} does not have anything to follow a node of type ${nodeTypeAfterIndex}`
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
      `Attempted to find a selection after node ${suggestionNode.type.name} at ${$pos.pos}, but could not find a node of type ${nodeTypeToSelect.name}`
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
  node: Node
) => {
  if (node.type !== chip) {
    return false;
  }

  const tr = view.state.tr;

  if (node.attrs[DELETE_CHIP_INTENT]) {
    // The caret belongs before the deleted chip
    const insertAt = Math.max(0, from - 1);
    tr.deleteRange(from, to)
      // Ensure whitespace separates the two searchText nodes surrounding the
      // chip, which are now joined
      .insertText(" ", insertAt)
      .setSelection(TextSelection.create(tr.doc, insertAt));
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

export const getErrorMessage = (e: unknown) =>
  e instanceof Error ? e.message : String(e);

export const queryHasChanged = (
  oldDoc: Node,
  newDoc: Node
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

export const applyReadOnlyChipKeys = (tr: Transaction) => {
  tr.doc.descendants((node, pos) => {
    const isChipKey = node.type === chipKey;

    const contentStart = pos;
    const contentEnd = contentStart + node.nodeSize;
    const selectionCoversChipKey =
      tr.selection.from >= contentStart && tr.selection.to <= contentEnd;

    if (isChipKey && !selectionCoversChipKey) {
      tr.setNodeAttribute(pos, IS_READ_ONLY, true);
    }
  });

  return true;
};
