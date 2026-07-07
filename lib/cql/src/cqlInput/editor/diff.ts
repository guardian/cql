import { Fragment, Mark, Node } from "prosemirror-model";
import { IS_READ_ONLY, IS_SELECTED } from "./schema";

/**
/**
 * These diff functions are vendored from ProseMirror's Fragment.findDiffStart /
 * findDiffEnd to customise attribute comparison.
 *
 * The originals use Node.sameMarkup, which compares all attributes. That
 * causes false positives for transient editor-state attributes (IS_SELECTED,
 * IS_READ_ONLY).
 *
 * We replace sameMarkup with sameContentMarkup, which skips transient attrs
 * so the diff is blind to decorative state but still detects semantically
 * meaningful changes like POLARITY.
 *
 * Source: https://github.com/ProseMirror/prosemirror-model/blob/c8c7b62645d2a8293fa6b7f52aa2b04a97821f34/src/diff.ts
 */
 * Source: https://github.com/ProseMirror/prosemirror-model/blob/c8c7b62645d2a8293fa6b7f52aa2b04a97821f34/src/diff.ts
 */

/** Attrs that are transient editor state, not query content. */
const TRANSIENT_ATTRS: ReadonlySet<string> = new Set([IS_SELECTED, IS_READ_ONLY]);

/**
 * Like Node.sameMarkup, but ignores transient editor-state attributes.
 */
function sameContentMarkup(a: Node, b: Node): boolean {
  if (a.type !== b.type || !Mark.sameSet(a.marks, b.marks)) return false;
  for (const key in a.attrs) {
    if (TRANSIENT_ATTRS.has(key)) continue;
    if (a.attrs[key] !== b.attrs[key]) return false;
  }
  for (const key in b.attrs) {
    if (TRANSIENT_ATTRS.has(key)) continue;
    if (!(key in a.attrs)) return false;
  }
  return true;
}

export function findDiffStartForContent(
  a: Fragment,
  b: Fragment,
  pos = 0,
): number | null {
  for (let i = 0; ; i++) {
    if (i == a.childCount || i == b.childCount)
      return a.childCount == b.childCount ? null : pos;

    const childA = a.child(i),
      childB = b.child(i);
    if (childA == childB) {
      pos += childA.nodeSize;
      continue;
    }

    if (!sameContentMarkup(childA, childB)) return pos;

    if (childA.isText && childA.text != childB.text) {
      for (let j = 0; childA.text![j] == childB.text![j]; j++) pos++;
      return pos;
    }
    if (childA.content.size || childB.content.size) {
      const inner = findDiffStartForContent(childA.content, childB.content, pos + 1);
      if (inner != null) return inner;
    }
    pos += childA.nodeSize;
  }
}

export function findDiffEndForContent(
  a: Fragment,
  b: Fragment,
  posA: number = a.size,
  posB: number = b.size,
): { a: number; b: number } | null {
  for (let iA = a.childCount, iB = b.childCount; ; ) {
    if (iA == 0 || iB == 0) return iA == iB ? null : { a: posA, b: posB };

    const childA = a.child(--iA),
      childB = b.child(--iB),
      size = childA.nodeSize;
    if (childA == childB) {
      posA -= size;
      posB -= size;
      continue;
    }

    if (!sameContentMarkup(childA, childB)) return { a: posA, b: posB };

    if (childA.isText && childA.text != childB.text) {
      let same = 0;
      const minSize = Math.min(childA.text!.length, childB.text!.length);
      while (
        same < minSize &&
        childA.text![childA.text!.length - same - 1] ==
          childB.text![childB.text!.length - same - 1]
      ) {
        same++;
        posA--;
        posB--;
      }
      return { a: posA, b: posB };
    }
    if (childA.content.size || childB.content.size) {
      const inner = findDiffEndForContent(
        childA.content,
        childB.content,
        posA - 1,
        posB - 1,
      );
      if (inner) return inner;
    }
    posA -= size;
    posB -= size;
  }
}
