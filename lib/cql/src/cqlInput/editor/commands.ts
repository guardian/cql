import { Command, Selection } from "prosemirror-state";

export const startOfLine: Command = (state, dispatch) => {
  const startSelection = Selection.atStart(state.doc);
  dispatch?.(state.tr.setSelection(startSelection));
  return true;
};

export const endOfLine: Command = (state, dispatch) => {
  const endSelection = Selection.atEnd(state.doc);
  dispatch?.(state.tr.setSelection(endSelection));
  return true;
};
