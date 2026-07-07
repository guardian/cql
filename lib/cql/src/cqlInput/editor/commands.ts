import { Command, selectAll } from "wordgard/command";
import { GardSelection } from "wordgard/state";
import { Leaf, Plot } from "wordgard/doc";
import {
  chip,
  chipKey,
  chipValue,
  chipKeyTag,
  chipType,
  chipValueTag,
  queryStr,
} from "./schema";
import { createParser } from "../../lang/Cql";
import {
  findNodeAt,
  getNextPositionAfterTypeaheadSelection,
  isSelectionWithinNodesOfType,
  selectionIsWithinNodeType,
  queryToProseMirrorDoc,
} from "./utils";
import { findDiffEndForContent, findDiffStartForContent } from "./diff";
import { TRANSACTION_IGNORE_READONLY } from "./plugins/cql";
import { hasWhitespace } from "../../lang/utils";

export const startOfLine: Command.Pure = ({ state }) => ({
  selection: GardSelection.atStart(state),
  scrollIntoView: true,
});

export const endOfLine: Command.Pure = ({ state }) => ({
  selection: GardSelection.atEnd(state),
  scrollIntoView: true,
});

export const maybeSelectValue: Command.Pure = (target) => {
  const { state } = target;
  const { from, to } = state.selection;
  const $from = state.doc.resolve(from);
  const fromNode = $from.parent.node;

  const isWithinValue = selectionIsWithinNodeType(state, chipValue);
  const selectionText = state.doc.slice(from, to).textContent();
  const selectionSpansWholeText = selectionText === fromNode.textContent();

  if (isWithinValue && !selectionSpansWholeText) {
    // Expand selection to value
    const start = $from.parent.start;
    const end = start + fromNode.textContent().length;
    return { selection: GardSelection.range(start, end) };
  }

  return selectAll(target, null);
};

/**
 * Update the editor state with the document created by the given query string.
 * Diffs to ensure that the update touches as little of the document as
 * possible, to help preserve selection state.
 */
export const applyQueryStr =
  (query: string, parser: ReturnType<typeof createParser>): Command.Pure =>
  (target) =>
    mergeDocs(queryToProseMirrorDoc(query, parser))(target, null);

/**
 * Update the editor state with the document. Diffs to ensure that the update
 * touches as little of the document as possible, to help preserve selection
 * state.
 */
export const mergeDocs =
  (newDoc: Plot.Doc): Command.Pure =>
  ({ state }) => {
    const start = findDiffStartForContent(newDoc.content, state.doc.content);
    if (start === null) {
      return false;
    }

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

    return {
      changes: {
        from: start,
        to: endB,
        insert: newDoc.slice(start, endA),
        fit: true,
      },
      // Map the existing selection forward through the change (assoc +1) to
      // match ProseMirror's default mapping bias, so a caret sitting exactly at
      // the start of an inserted region moves to the right of the insertion.
      selection: (cx, changes) => state.selection.map(changes, cx, 1),
    };
  };

export const insertChip =
  (polarity: "+" | "-", chipKeyContent: string): Command.Pure =>
  ({ state }) => {
    const initialFrom = state.selection.from;
    const chipNode = chipType.of(polarity).create([
      chipKeyTag.create(chipKeyContent ? [Leaf.text(chipKeyContent)] : []),
      chipValueTag.create([]),
    ]);

    // If there's no chip key content, place the caret in the key. Otherwise,
    // move on to the value.
    const caretDestination = chipKeyContent ? chipValue : chipKey;

    return {
      changes: {
        from: initialFrom,
        to: initialFrom,
        insert: [chipNode],
        fit: true,
      },
      selection: (cx, changes) => {
        const nodePos = findNodeAt(
          changes.mapPos(initialFrom, -1),
          cx.doc,
          caretDestination,
        );

        return nodePos === -1 ? null : GardSelection.near(cx, nodePos + 1);
      },
    };
  };

/**
 * Remove the chip at the current selection if:
 *   - the selection is within a key, and the key is empty
 *   - the selection is within a value, and the value is empty
 * @return the transaction spec that removes the chip, or false if no chip is
 * removed.
 */
export const removeChipAtSelectionIfEmpty: Command.Pure = (target) => {
  const { state } = target;
  const { doc, selection } = state;

  if (isSelectionWithinNodesOfType(doc, selection, [chipKey, chipValue])) {
    const $pos = doc.resolve(selection.from);
    const nodeAtSelection = $pos.parent.node;
    if (!nodeAtSelection.textContent()) {
      const chipPos = $pos.matchingParent((plot) => plot.type === chip);
      if (!chipPos) {
        return false;
      }
      return removeChipCoveringRange(chipPos.before, chipPos.after)(
        target,
        null,
      );
    }
  }
  return false;
};

export const removeChipAdjacentToSelection =
  (searchForward: boolean = false): Command.Pure =>
  (target) => {
    const { state } = target;
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
      to = $nextPos.pos + nodeToRemove.length;
    } else {
      // Look backward for a chip to remove
      const { anchor } = state.selection;
      const positionBeforeSearchText = Math.max(anchor - 1, 0);
      const $prevPos = state.doc.resolve(positionBeforeSearchText);
      const nodeToRemove = $prevPos.nodeBefore;
      if (!nodeToRemove || nodeToRemove.type !== chip) {
        return false;
      }

      const prevNodePos = $prevPos.pos - nodeToRemove.length;
      from = prevNodePos;
      to = $prevPos.pos;
    }

    return removeChipCoveringRange(from, to)(target, null);
  };

export const removeChipCoveringRange =
  (from: number, to: number): Command.Pure =>
  ({ state }) => {
    const { doc } = state;
    const removedText = doc.slice(from, to).textContent();

    // If the document has content beyond the chip we're removing, ensure
    // whitespace separates the two queryStr nodes surrounding the chip, which
    // are now joined.
    const docHasOtherText = doc.textContent().length > removedText.length;
    const insert = docHasOtherText ? [Leaf.text(" ")] : [];

    const deleteFrom = Math.max(0, from - 1);

    return {
      changes: { from: deleteFrom, to: to + 1, insert, fit: true },
      selection: (cx, changes) =>
        GardSelection.near(cx, changes.mapPos(deleteFrom)),
    };
  };

/**
 * Inserts whitespace after a `+` is inserted into a query string with trailing
 * whitespace, to ensure it's correctly handled as the start of a chip, and not
 * a part of the following query.
 */
export const maybeAddChipAtPolarityChar =
  (polarity: "+" | "-"): Command.Pure =>
  (target) => {
    const { state } = target;
    const { doc, selection } = state;
    const $from = doc.resolve(selection.from);

    if ($from.parent.node.type !== queryStr) {
      return false;
    }

    const characterAfterCaret = doc
      .slice(selection.from, Math.min(selection.to + 1, doc.length))
      .textContent();

    const characterBeforeCaret = doc
      .slice(Math.max(selection.from - 1, 0), selection.from)
      .textContent();

    function isNonEmptyNonWhitespace(str: string) {
      return !hasWhitespace(str) && str !== "";
    }

    if (isNonEmptyNonWhitespace(characterBeforeCaret)) {
      return false;
    }

    if (polarity === "-" && isNonEmptyNonWhitespace(characterAfterCaret)) {
      return false;
    }

    return insertChip(polarity, "")(target, null);
  };

/**
 * If we're inserting a trailing colon in chipKey position, move to chipValue
 * position.
 */
export const handleColon: Command.Pure = (target) => {
  const { state } = target;
  const $from = state.doc.resolve(state.selection.from);
  const selectionIsAtEndOfNode =
    state.selection.from === $from.parent.after - 1;
  if (selectionIsWithinNodeType(state, chipKey) && selectionIsAtEndOfNode) {
    return skipSuggestion(target, null);
  }

  return false;
};

export const skipSuggestion: Command.Pure = ({ state }) => {
  const insertPos = getNextPositionAfterTypeaheadSelection(
    state.doc,
    state.selection.from,
  );

  if (insertPos === undefined) {
    return {};
  }

  return {
    selection: GardSelection.cursor(insertPos),
    annotations: TRANSACTION_IGNORE_READONLY.of(true),
  };
};
