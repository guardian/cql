import { Leaf, Node } from "wordgard/doc";

/**
 * These diff functions are vendored to ignore attributes and markup, as we only care about markup.
 * Source: https://github.com/ProseMirror/prosemirror-model/blob/c8c7b62645d2a8293fa6b7f52aa2b04a97821f34/src/diff.ts
 *
 * Adapted for wordgard: ProseMirror `Fragment`s are represented here as the
 * `readonly Node[]` content arrays of a plot. `nodeSize` becomes `length`,
 * `content.size` becomes the summed content length, and structural equality
 * (`eq`) replaces ProseMirror's identity fast-path.
 */

type Content = readonly Node[];

const contentSize = (content: Content): number =>
  content.reduce((size, node) => size + node.length, 0);

const childContent = (node: Node): Content => (node.isPlot ? node.content : []);

const isTextNode = (node: Node): node is Leaf<string> => node.isText;

export function findDiffStartForContent(
  a: Content,
  b: Content,
  pos = 0,
): number | null {
  for (let i = 0; ; i++) {
    if (i == a.length || i == b.length)
      return a.length == b.length ? null : pos;

    const childA = a[i],
      childB = b[i];
    if (childA.eq(childB)) {
      pos += childA.length;
      continue;
    }

    if (
      isTextNode(childA) &&
      isTextNode(childB) &&
      childA.param != childB.param
    ) {
      for (let j = 0; childA.param[j] == childB.param[j]; j++) pos++;
      return pos;
    }
    // ProseMirror's `findDiffStart` returns `pos` here when the two nodes have
    // different markup (`!childA.sameMarkup(childB)`). We only care about the
    // node *type* — attributes/marks are intentionally ignored — but the type
    // guard is essential: without it, two nodes of different types (e.g. a
    // `queryStr` and a `chip`) would be recursed into as if they were the same
    // node, yielding a bogus diff position and a corrupted merge.
    if (childA.type !== childB.type) {
      return pos;
    }
    const contentA = childContent(childA);
    const contentB = childContent(childB);
    if (contentA.length || contentB.length) {
      const inner = findDiffStartForContent(contentA, contentB, pos + 1);
      if (inner != null) return inner;
    }
    pos += childA.length;
  }
}

export function findDiffEndForContent(
  a: Content,
  b: Content,
  posA: number = contentSize(a),
  posB: number = contentSize(b),
): { a: number; b: number } | null {
  for (let iA = a.length, iB = b.length; ; ) {
    if (iA == 0 || iB == 0) return iA == iB ? null : { a: posA, b: posB };

    const childA = a[--iA],
      childB = b[--iB],
      size = childA.length;
    if (childA.eq(childB)) {
      posA -= size;
      posB -= size;
      continue;
    }

    if (
      isTextNode(childA) &&
      isTextNode(childB) &&
      childA.param != childB.param
    ) {
      let same = 0;
      const minSize = Math.min(childA.param.length, childB.param.length);
      while (
        same < minSize &&
        childA.param[childA.param.length - same - 1] ==
          childB.param[childB.param.length - same - 1]
      ) {
        same++;
        posA--;
        posB--;
      }
      return { a: posA, b: posB };
    }
    // Different node types mark the end boundary of the diff (see the matching
    // comment in `findDiffStartForContent`). Only recurse into children when
    // the nodes share a type.
    if (childA.type !== childB.type) {
      return { a: posA, b: posB };
    }
    const contentA = childContent(childA);
    const contentB = childContent(childB);
    if (contentA.length || contentB.length) {
      const inner = findDiffEndForContent(
        contentA,
        contentB,
        posA - 1,
        posB - 1,
      );
      if (inner) return inner;
    }
    posA -= size;
    posB -= size;
  }
}
