import {
  Command,
  NodeSelection,
  Selection,
  TextSelection,
} from "prosemirror-state";
import { chip, chipKey, chipValue } from "./schema";
import { selectAll } from "prosemirror-commands";
import { createParser } from "../../lang/Cql";
import { findNodeAt, queryToProseMirrorDoc } from "./utils";
import { findDiffEndForContent, findDiffStartForContent } from "./diff";
import { Node } from "prosemirror-model";
import { schema } from "prosemirror-test-builder";

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
  (state, dispatch) =>
    mergeDocs(queryToProseMirrorDoc(query, parser))(state, dispatch);

/**
 * Update the editor state with the document. Diffs to ensure that the update
 * touches as little of the document as possible, to help preserve selection
 * state.
 */
export const mergeDocs =
  (newDoc: Node): Command =>
  (state, dispatch) => {
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

      const tr = state.tr.replace(start, endB, newDoc.slice(start, endA));

      dispatch?.(tr);
    }

    return true;
  };

export const insertChip =
  (chipKeyContent: string): Command =>
  (state, dispatch) => {
    const tr = state.tr;
    const node = chip.create(null, [
      chipKey.create(null, schema.text(chipKeyContent)),
      chipValue.create(),
    ]);

    tr.replaceSelectionWith(node);

    const chipValuePos = findNodeAt(state.selection.from, tr.doc, chipValue);
    const sel = NodeSelection.create(tr.doc, chipValuePos);
    tr.setSelection(sel);

    dispatch?.(tr);

    return true;
  };
