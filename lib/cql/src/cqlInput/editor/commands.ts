import { Command, EditorState, Selection, TextSelection } from "prosemirror-state";
import { chipValue } from "./schema";
import { selectAll } from "prosemirror-commands";

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
