import { Command, Selection } from "prosemirror-state";

export const topOfLine: Command = (state, dispatch) => {
  const startSelection = Selection.atStart(state.doc);
  dispatch?.(state.tr.setSelection(startSelection));
  return true;
};

export const bottomOfLine: Command = (state, dispatch) => {
  const endSelection = Selection.atEnd(state.doc);
  dispatch?.(state.tr.setSelection(endSelection));
  return true;
};
