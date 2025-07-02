import { Command, Selection, TextSelection } from "prosemirror-state";
import { chip, chipValue, queryStr } from "./schema";
import { selectAll } from "prosemirror-commands";
import { createParser } from "../../lang/Cql";
import { queryToProseMirrorDoc } from "./utils";
import { findDiffEndForContent, findDiffStartForContent } from "./diff";
import { logNode } from "./debug";

export const startOfLine: Command = (state, dispatch) => {
  const startSelection = Selection.atStart(state.doc);
  dispatch?.(state.tr.setSelection(startSelection).scrollIntoView());
  return true;
};

export const endOfLine: Command = (state, dispatch) => {
  const endSelection = Selection.atEnd(state.doc);
  dispatch?.(state.tr.setSelection(endSelection).scrollIntoView());
  return true;
};

export const maybeSelectValue: Command = (state, dispatch) => {
  const { from, to } = state.selection;
  const $from = state.doc.resolve(from);
  const $to = state.doc.resolve(to);
  const fromNode = $from.node();
  const toNode = $to.node();

  const isWithinKey = fromNode.type === chipValue && fromNode === toNode;
  const selectionContent = state.selection.content().content;
  const selectionSpansWholeText =
    selectionContent.textBetween(0, selectionContent.size) ===
    fromNode.textContent;

  if (isWithinKey && !selectionSpansWholeText) {
    // Expand selection to key
    const from = $from.start();
    const to = from + fromNode.textContent.length;
    dispatch?.(
      state.tr.setSelection(TextSelection.create(state.doc, from, to)),
    );
    return true;
  }

  return selectAll(state, dispatch);
};

/**
 * Update the editor state with the document created by the given query string.
 * Diffs to ensure that the update touches as little of the document as
 * possible, to help preserve selection state.
 */
export const applyQueryStr =
  (query: string, parser: ReturnType<typeof createParser>): Command =>
  (state, dispatch) => {
    const newDoc = queryToProseMirrorDoc(query, parser);

    const start = findDiffStartForContent(newDoc.content, state.doc.content);
    if (start !== null) {
      // We can assert here because we know that the docs differ
      let { a: endA, b: endB } = findDiffEndForContent(
        newDoc.content,
        state.doc.content,
      )!;
      const overlap = start - Math.min(endA, endB);
      if (overlap > 0) {
        endA += overlap;
        endB += overlap;
      }

      logNode(state.doc);

      const tr = state.tr.replace(start, endB, newDoc.slice(start, endA));

      const selectionIsCollapsed = state.selection.from === state.selection.to;
      const selectionIsAtEndOfDiff = state.selection.to === endB;

      if (selectionIsCollapsed && selectionIsAtEndOfDiff) {
        // If the caret is pointing at the end of the diff, and there's a chip
        // behind it, keep the selection within a chip value, rather than
        // shunting it into an empty queryStr
        const mappedSelection = tr.mapping.map(endB);
        const $posAtSelection = tr.doc.resolve(mappedSelection);
        const $posBeforeSelection = tr.doc.resolve(
          Math.max($posAtSelection.before() - 1, 0)
        );
        if (
          $posAtSelection.node().type === queryStr &&
          $posBeforeSelection.node().type === chip
        ) {
          const newSelection = TextSelection.near($posBeforeSelection, -1);

          tr.setSelection(newSelection);
        }
      }

      dispatch?.(tr);
    }

    return true;
  };
