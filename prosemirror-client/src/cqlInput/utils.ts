import { Mapping, StepMap } from "prosemirror-transform";
import { Decoration, EditorView } from "prosemirror-view";
import {
  DELETE_CHIP_INTENT,
  chip,
  chipKey,
  chipValue,
  chipWrapper,
  doc,
  schema,
  searchText,
} from "./schema";
import { Node, NodeType } from "prosemirror-model";
import { Selection, TextSelection } from "prosemirror-state";
import { ERROR_CLASS } from "./plugin";

const tokensToPreserve = ["QUERY_FIELD_KEY", "QUERY_VALUE"];

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
 */
export const createProseMirrorTokenToDocumentMap = (
  tokens: ProseMirrorToken[]
) => {
  // We only distinguish between key/val tokens here – other tokens are universally
  // represented as searchText. We join the other tokens into single ranges so we
  // can provide mappings for their node representation.
  const compactedTokenRanges = tokens.reduce((acc, { from, to, tokenType }) => {
    if (tokensToPreserve.includes(tokenType)) {
      return acc.concat({ from, to, tokenType });
    }

    const prevToken = acc.at(-1);

    if (!prevToken || tokensToPreserve.includes(prevToken.tokenType)) {
      return acc.concat({ from, to, tokenType });
    }

    return acc
      .slice(0, acc.length - 1)
      .concat({ from: prevToken.from, to, tokenType });
  }, [] as { from: number; to: number; tokenType: string }[]);

  const ranges = compactedTokenRanges.reduce<[number, number, number][]>(
    (ranges, { tokenType, from, to }) => {
      switch (tokenType) {
        case "QUERY_FIELD_KEY":
          // We add mappings here to accommodate the positions occupied by node boundaries.
          return ranges.concat(
            // chip begin (+1)
            // chipKey begin (+1)
            // leading char ('+')
            [from - 1, 0, 3]
          );
        case "QUERY_VALUE":
          return ranges.concat(
            // leading char ('+')
            [from - 1, 0, 1],
            // chipValue end (+1)
            [to, 0, 1]
          );
        default:
          return ranges.concat(
            [from, 0, 1], // searchText begin (+1)
            [to, 0, 1] // searchText end (+1)
          );
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
export const tokensToDoc = (tokens: ProseMirrorToken[]): Node => {
  const nodes = tokens.reduce<Node[]>((acc, token, index): Node[] => {
    switch (token.tokenType) {
      case "QUERY_FIELD_KEY":
        const tokenKey = token.literal;
        const tokenValue = tokens[index + 1]?.literal;
        return acc.concat(
          chipWrapper.create(undefined, [
            chip.create(undefined, [
              chipKey.create(
                undefined,
                tokenKey ? schema.text(tokenKey) : undefined
              ),
              chipValue.create(undefined, schema.text(tokenValue ?? " ")),
            ]),
          ])
        );
      case "QUERY_VALUE":
      case "EOF":
        return acc;
      default:
        // If this token terminates and the next token begins ahead of it, add
        // the whitespace that separates them.
        const nextTokenPos = tokens[index + 1]?.from;

        const lexemeIncludingTrailingWhitespace = nextTokenPos
          ? token.lexeme.padEnd(nextTokenPos - token.from, " ")
          : token.lexeme;

        // Join non-KV pairs into a single searchText node
        const prevNode = acc[acc.length - 1];
        if (prevNode?.type === searchText) {
          return acc
            .slice(0, acc.length - 1)
            .concat(
              searchText.create(
                undefined,
                schema.text(
                  `${prevNode.textContent}${lexemeIncludingTrailingWhitespace}`
                )
              )
            );
        }

        return acc.concat(
          searchText.create(
            undefined,
            schema.text(lexemeIncludingTrailingWhitespace)
          )
        );
    }
  }, [] as Node[]);

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

export const queryStrFromDoc = (doc: Node) => {
  let str: string = "";

  doc.descendants((node) => {
    switch (node.type.name) {
      case "searchText":
        str += node.textContent;
        return false;
      case "chipKey":
        str += `+${node.textContent}`;
        return false;
      case "chipValue":
        str += node.textContent.length > 0 ? `:${node.textContent} ` : "";
        return false;
      default:
        return true;
    }
  });

  return str;
};

const keyValPairChars = ["+", "@"];

export const isBeginningKeyValPair = (
  first: string,
  second: string
): boolean => {
  const firstDiffChar = getFirstDiff(first, second);
  return firstDiffChar ? keyValPairChars.includes(firstDiffChar) : false;
};

const getFirstDiff = (first: string, second: string): string | undefined => {
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
  if (node.type !== chipWrapper) {
    return false;
  }

  const tr = view.state.tr;

  if (node.attrs[DELETE_CHIP_INTENT]) {
    const insertAt = Math.max(0, from - 1);
    tr.deleteRange(from, to)
      // Prosemirror removes the whitespace in the preceding searchText,
      // regardless of range, for reasons I've yet to discover – add it back
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
