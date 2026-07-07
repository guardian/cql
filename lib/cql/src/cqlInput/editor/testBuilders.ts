import { Leaf, Node, Plot } from "wordgard/doc";
import {
  POLARITY,
  chipKeyTag,
  chipType,
  chipValueTag,
  queryStrTag,
  schema,
} from "./schema";

/**
 * A lightweight re-implementation of the parts of `prosemirror-test-builder`
 * used by the CQL tests, backed by the wordgard schema.
 *
 * Builders accept text that may embed `<name>` position markers. The resolved
 * document positions are collected onto the top-level document node's
 * `positions` property. (Wordgard already uses `tag` on a `Plot` for the plot
 * tag, so we cannot reuse that name as `prosemirror-test-builder` does.)
 *
 * Positions follow the same accounting as wordgard/ProseMirror: entering a
 * plot consumes a single position for its opening token, a text leaf occupies
 * one position per character, and the document's content starts at position 0.
 */

// Tags collected at build time, keyed by node, storing each tag's position
// relative to that node's start (i.e. including the node's own opening token).
const nodeTags = new WeakMap<Node, Record<string, number>>();

const markerRegExp = /<(\w+)>/g;

const parseMarkers = (
  text: string,
): { clean: string; tags: Array<[string, number]> } => {
  const tags: Array<[string, number]> = [];
  let clean = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  markerRegExp.lastIndex = 0;
  while ((match = markerRegExp.exec(text)) !== null) {
    clean += text.slice(lastIndex, match.index);
    tags.push([match[1], clean.length]);
    lastIndex = match.index + match[0].length;
  }
  clean += text.slice(lastIndex);
  return { clean, tags };
};

const makeBlock =
  (type: { create: (content?: readonly Node[]) => Plot }) =>
  (text?: string): Node => {
    const { clean, tags } = parseMarkers(text ?? "");
    const node = type.create(clean ? [Leaf.text(clean)] : []);
    if (tags.length) {
      const rel: Record<string, number> = {};
      for (const [name, offset] of tags) {
        // +1 accounts for the node's opening token.
        rel[name] = offset + 1;
      }
      nodeTags.set(node, rel);
    }
    return node;
  };

export const queryStr = makeBlock(queryStrTag);
export const chipKey = makeBlock(chipKeyTag);
export const chipValue = makeBlock(chipValueTag);

type ChipAttrs = { [POLARITY]: string };

const isChipAttrs = (value: Node | ChipAttrs): value is ChipAttrs =>
  typeof value === "object" && value !== null && !("type" in value);

/**
 * Merge the tags of a list of children into a single record, offset by each
 * child's start position within the parent. `startOffset` is the position of
 * the first child relative to the parent's start (1 for a plot with an opening
 * token, 0 for the document).
 */
const composeTags = (
  parent: Node,
  children: readonly Node[],
  startOffset: number,
): Record<string, number> => {
  const rel: Record<string, number> = {};
  let offset = startOffset;
  for (const child of children) {
    const childTags = nodeTags.get(child);
    if (childTags) {
      for (const [name, pos] of Object.entries(childTags)) {
        rel[name] = offset + pos;
      }
    }
    offset += child.length;
  }
  if (Object.keys(rel).length) {
    nodeTags.set(parent, rel);
  }
  return rel;
};

export const chip = (first: Node | ChipAttrs, ...rest: Node[]): Node => {
  const attrs = isChipAttrs(first) ? first : undefined;
  const children = attrs ? rest : [first as Node, ...rest];
  const polarity = attrs ? attrs[POLARITY] : "+";
  const node = chipType.of(polarity).create(children);
  composeTags(node, children, 1);
  return node;
};

export type DocWithPositions = Plot.Doc & {
  positions: Record<string, number>;
};

export const doc = (...children: Node[]): DocWithPositions => {
  const node = schema.doc(children) as DocWithPositions;
  node.positions = composeTags(node, children, 0);
  return node;
};
