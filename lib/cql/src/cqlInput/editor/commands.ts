import { Command, Selection, TextSelection } from "prosemirror-state";
import {
  chip,
  chipKey,
  chipValue,
  IS_READ_ONLY,
  POLARITY,
  queryStr,
} from "./schema";
import { selectAll } from "prosemirror-commands";
import { createParser } from "../../lang/Cql";
import {
  findNodeAt,
  getNextPositionAfterTypeaheadSelection,
  isSelectionWithinNodesOfType,
  selectionIsWithinNodeType,
  queryToProseMirrorDoc,
} from "./utils";
import { findDiffEndForContent, findDiffStartForContent } from "./diff";
import { Node } from "prosemirror-model";
import { schema } from "prosemirror-test-builder";
import { TRANSACTION_IGNORE_READONLY } from "./plugins/cql";
import { hasWhitespace } from "../../lang/utils";
import { EditorView } from "prosemirror-view";

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
  const { from } = state.selection;
  const $from = state.doc.resolve(from);
  const fromNode = $from.node();

  const isWithinValue = selectionIsWithinNodeType(state, chipValue);
  const selectionContent = state.selection.content().content;
  const selectionSpansWholeText =
    selectionContent.textBetween(0, selectionContent.size) ===
    fromNode.textContent;

  if (isWithinValue && !selectionSpansWholeText) {
    // Expand selection to value
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
  (polarity: "+" | "-", chipKeyContent: string) => (view: EditorView) => {
    const initialFrom = view.state.selection.from;
    const addChipTr = view.state.tr;
    const node = chip.create({ [POLARITY]: polarity }, [
      chipKey.create(
        { [IS_READ_ONLY]: true },
        chipKeyContent ? schema.text(chipKeyContent) : null,
      ),
      chipValue.create({ [IS_READ_ONLY]: false }),
    ]);

    addChipTr.replaceRangeWith(initialFrom, initialFrom, node);

    view.dispatch(addChipTr);

    const positionCaretTr = view.state.tr;
    const caretDestination = !chipKeyContent ? chipKey : chipValue;
    const caretPos = findNodeAt(
      initialFrom,
      positionCaretTr.doc,
      caretDestination,
    );
    const sel = TextSelection.near(positionCaretTr.doc.resolve(caretPos));
    positionCaretTr.setSelection(sel);

    view.dispatch(positionCaretTr);

    return true;
  };

/**
 * Remove the chip at the current selection if:
 *   - the selection is within a key, and the key is empty
 *   - the selection is within a value, and the value is empty
 * @return true if a chip is removed, false if not.
 */
export const removeChipAtSelectionIfEmpty: Command = (state, dispatch) => {
  const { doc, selection } = state;

  if (isSelectionWithinNodesOfType(doc, selection, [chipKey, chipValue])) {
    const $pos = doc.resolve(selection.from);
    const nodeAtSelection = $pos.node();
    if (!nodeAtSelection.textContent) {
      const $chipPos = doc.resolve($pos.before(1));
      const chipNode = $chipPos.nodeAfter;
      if (!chipNode || chipNode.type !== chip) {
        return false;
      }
      removeChipCoveringRange($chipPos.pos, $chipPos.pos + chipNode.nodeSize)(
        state,
        dispatch,
      );
      return true;
    }
  }
  return false;
};

export const removeChipAdjacentToSelection =
  (searchForward: boolean = false): Command =>
  (state, dispatch) => {
    if (state.selection.from !== state.selection.to) {
      return false;
    }

    let from: number;
    let to: number;

    if (searchForward) {
      // Look forward for a chip to remove
      const { anchor } = state.selection;
      const positionAfterSearchText = Math.max(anchor + 1, 0);
      const $nextPos = state.doc.resolve(positionAfterSearchText);
      const nodeToRemove = $nextPos.nodeAfter;
      if (!nodeToRemove || nodeToRemove.type !== chip) {
        return false;
      }

      from = $nextPos.pos;
      to = $nextPos.pos + nodeToRemove.nodeSize;
    } else {
      // Look backward for a chip to remove
      const { anchor } = state.selection;
      const positionBeforeSearchText = Math.max(anchor - 1, 0);
      const $prevPos = state.doc.resolve(positionBeforeSearchText);
      const nodeToRemove = $prevPos.nodeBefore;
      if (!nodeToRemove || nodeToRemove.type !== chip) {
        return false;
      }

      const prevNodePos = $prevPos.pos - nodeToRemove.nodeSize;
      from = prevNodePos;
      to = $prevPos.pos;
    }

    return removeChipCoveringRange(from, to)(state, dispatch);
  };

export const removeChipCoveringRange =
  (from: number, to: number): Command =>
  (state, dispatch) => {
    const { tr } = state;
    const insertAt = Math.max(0, from - 1);
    tr.deleteRange(from - 1, to + 1);

    // If the document has content, ensure whitespace separates the two queryStr
    // nodes surrounding the chip, which are now joined.
    if (tr.doc.textContent) {
      tr.setSelection(
        TextSelection.near(tr.doc.resolve(insertAt), -1),
      ).insertText(" ");
    }

    dispatch?.(tr);

    return true;
  };

/**
 * Inserts whitespace after a `+` is inserted into a query string with trailing
 * whitespace, to ensure it's correctly handled as the start of a chip, and not
 * a part of the following query.
 */
export const maybeAddChipAtPolarityChar =
  (polarity: "+" | "-") => (view: EditorView) => {
    const { doc, selection } = view.state;

    if (selection.$from.node().type !== queryStr) {
      return false;
    }

    const suffix = doc.textBetween(
      selection.from,
      Math.min(selection.to + 1, doc.nodeSize - 2),
    );

    if (polarity === "-" && !hasWhitespace(suffix) && suffix !== "") {
      return false;
    }

    insertChip(polarity, "")(view);

    return true;
  };

/**
 * If we're inserting a trailing colon in chipKey position, move to chipValue
 * position.
 */
export const handleColon: Command = (state, dispatch) => {
  const selectionIsAtEndOfNode =
    state.selection.from === state.selection.$from.after() - 1;
  if (selectionIsWithinNodeType(state, chipKey) && selectionIsAtEndOfNode) {
    return skipSuggestion(state, dispatch);
  }

  return false;
};

export const skipSuggestion: Command = (state, dispatch) => {
  const tr = state.tr;
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

  dispatch?.(tr);

  return true;
};
