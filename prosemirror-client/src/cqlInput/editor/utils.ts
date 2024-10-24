import { Mapping, StepMap } from "prosemirror-transform";
import { Decoration, EditorView } from "prosemirror-view";
import {
  DELETE_CHIP_INTENT,
  chip,
  chipKey,
  chipValue,
  doc,
  schema,
  searchText,
} from "./schema";
import { Node, NodeType } from "prosemirror-model";
import { Selection, TextSelection } from "prosemirror-state";
import { ERROR_CLASS } from "./plugin";
import { Token } from "../../lang/token";
import { MappedTypeaheadSuggestion, TypeaheadSuggestion } from "../../lang/types";
import { CqlResult } from "../../lang/Cql";
import { CqlError } from "../../services/CqlService";

const tokensToPreserve = ["QUERY_FIELD_KEY", "QUERY_VALUE", "EOF"];

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

const getQueryFieldKeyRange = (from: number): [number, number, number] =>
  // chipKey begin (-1)
  // chip begin (-1)
  // leading char ('+') (+1)
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

const getSearchTextRanges = (from: number): [number, number, number][] => [
  [from, -1, 0], // searchText begin (+1)
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
 *  <doc> <searchText> s t r </searchText> <chipWrapper> <chip> <chipKey> k
 *  </chipKey> <chipValue> v </chipValue> </chip> </chipWrapper> </doc>
 * |     |            | | | |             |             |      |         | |          |           | |            |       |              |      |
 * 0     1            2 3 4 5             6             7      8         9 10 11
 * 12 13           14      15             16     17
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
        case "QUERY_FIELD_KEY":
          // If this field is at the start of the document, or preceded by a
          // field value, the editor will add a searchText node to conform to
          // the schema, which we must account for, so we add a searchText
          // mapping.
          const previousToken = tokens[index - 1];
          const shouldAddSearchTextMapping =
            previousToken?.tokenType === "QUERY_VALUE" || index === 0;
          return accRanges.concat(
            ...(shouldAddSearchTextMapping
              ? getSearchTextRanges(previousToken?.to)
              : []),
            getQueryFieldKeyRange(from)
          );
        case "QUERY_VALUE":
          return accRanges.concat(...getQueryValueRanges(from, to));
        default:
          return accRanges.concat(...getSearchTextRanges(from));
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
        case "QUERY_FIELD_KEY": {
          const tokenKey = token.literal;
          const nextToken = tokens[index + 1];
          const tokenValue =
            nextToken.tokenType === "QUERY_VALUE" ? nextToken.literal : "";
          const previousToken = tokens[index - 1];
          const isPrecededByChip =
            previousToken?.tokenType === "QUERY_VALUE" ||
            previousToken?.tokenType === "QUERY_FIELD_KEY";
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
        case "QUERY_VALUE":
          return acc;
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
          // If the next token is further ahead of this token by more than one position,
          // it is separated by whitespace – append the whitespace to this node
          const nextToken = tokens[index + 1];
          const whitespaceChars = nextToken?.from - token.to - 1;
          const whitespaceToAdd =
            whitespaceChars >= 0 ? " ".repeat(whitespaceChars) : "";

          const previousNode = acc[acc.length - 1];
          if (previousNode?.type === searchText) {
            // Join consecutive searchText nodes
            return acc
              .slice(0, acc.length - 1)
              .concat(
                searchText.create(
                  undefined,
                  schema.text(
                    previousNode.textContent + token.lexeme + whitespaceToAdd
                  )
                )
              );
          }

          return acc.concat(
            searchText.create(
              undefined,
              schema.text(token.lexeme + whitespaceToAdd)
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

const tokensThatAreNotDecorated = ["QUERY_FIELD_KEY", "QUERY_VALUE", "EOF"];

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

export const docToQueryStr = (doc: Node) => {
  let str: string = "";

  doc.descendants((node, _pos) => {
    switch (node.type.name) {
      case "searchText":
        str += node.textContent;
        return false;
      case "chipKey":
        // Anticipate a chipValue here, adding the colon – if we do not, and a
        // chipValue is not present, we throw the mappings off.
        str += ` +${node.textContent}:`;
        return false;
      case "chipValue":
        str +=
          node.textContent.trim().length > 0 ? `${node.textContent} ` : " ";
        return false;
      default:
        return true;
    }
  });

  return str;
};

const keyValPairChars = ["+"];

export const isBeginningKeyValPair = (
  first: string,
  second: string
): boolean => {
  const firstDiffChar = getFirstDiff(first, second);
  return firstDiffChar ? keyValPairChars.includes(firstDiffChar) : false;
};

const getFirstDiff = (_first: string, _second: string): string | undefined => {
  const first = _first.trim();
  const second = _second.trim();

  if (first.length < second.length) {
    return second[second.length - 1];
  }

  for (let i = 0; i < first.length; i++) {
    if (second[i] !== first[i]) {
      return second[i];
    }
  }
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

export const getNewSelection = (
  currentSelection: Selection,
  shouldWrapSelectionInKey: boolean,
  doc: Node
): Selection => {
  if (shouldWrapSelectionInKey) {
    const nodePos = findNodeAt(currentSelection.from, doc, chipKey);

    if (nodePos !== -1) {
      const $pos = doc.resolve(nodePos);
      const selection = TextSelection.near($pos, 1);
      if (selection) {
        return selection;
      }
    }
  }

  return TextSelection.create(
    doc,
    Math.min(currentSelection.from, doc.nodeSize - 2),
    Math.min(currentSelection.to, doc.nodeSize - 2)
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
  const suggestions = toMappedSuggestions(result.suggestions ?? [], mapping);

  return {
    ...result,
    tokens,
    suggestions,
    error,
    mapping,
  };
};

// The node to move the caret to after a typeahead selection is made, e.g. when
// a typeahead value is inserted for a chipKey, move the caret to the next
// chipValue.
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
      `No node found to follow node of type ${suggestionNode.type.name}`
    );
    return;
  }

  const nodeTypeToSelect = typeaheadSelectionSequence[nodeTypeAfterIndex + 1];

  if (!nodeTypeToSelect) {
    console.warn(
      `Could not find a node to search for after pos ${currentPos} with ${suggestionNode.type.name}`
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
      `Attempted to find a cursor position after node ${suggestionNode.type.name} at ${$pos.pos}, but could not find a valid subsequent node.`
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

/**
 * Utility function to log node structure to console.
 */
export const logNode = (doc: Node) => {
  console.log(`Log node ${doc.type.name}:`);

  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    const indent = doc.resolve(pos).depth * 4;
    const content =
      node.type.name === "text" ? `'${node.textContent}'` : undefined;
    console.log(
      `${" ".repeat(indent)} ${node.type.name} ${pos}-${pos + node.nodeSize} ${
        content ? content : ""
      }`
    );
  });
};

export const errorToDecoration = (position: number): Decoration => {
  const toDOM = () => {
    const el = document.createElement("span");
    el.classList.add(ERROR_CLASS);
    return el;
  };

  return Decoration.widget(position, toDOM);
};

export const getErrorMessage = (e: unknown) =>
  e instanceof Error ? e.message : String(e);
