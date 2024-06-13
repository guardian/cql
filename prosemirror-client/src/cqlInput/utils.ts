import { Mapping, StepMap } from "prosemirror-transform";
import { Decoration } from "prosemirror-view";
import {
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
import { SelectionAnchor } from "./plugin";

const tokensToPreserve = ["QUERY_FIELD_KEY", "QUERY_VALUE"];

export const createTokenMap = (tokens: ProseMirrorToken[]) => {
  // We only distinguish between key/val tokens here – other tokens are universally
  // represented as searchText. We join the other tokens into single ranges so they
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

export const mapTokens = (tokens: ProseMirrorToken[]): ProseMirrorToken[] => {
  const mapping = createTokenMap(tokens);

  return tokens.map(({ from, to, ...rest }) => ({
    from: mapping.map(from),
    to: mapping.map(to, -1),
    ...rest,
  }));
};

export const tokensToNodes = (tokens: ProseMirrorToken[]): Node => {
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
        // If this token terminates and the next non-EOF token begins ahead of it,
        // add the whitespace that separates them.
        const nextTokenPos =
          tokens[index + 1].tokenType !== "EOF"
            ? tokens[index + 1]?.from
            : undefined;

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
