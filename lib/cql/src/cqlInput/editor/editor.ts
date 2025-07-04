import { EditorView } from "prosemirror-view";
import { EditorState, Plugin } from "prosemirror-state";
import { schema } from "./schema";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import {
  applyQueryStr,
  endOfLine,
  maybeSelectValue,
  startOfLine,
} from "./commands";
import { createPlaceholderPlugin } from "./plugins/placeholder";
import { queryToProseMirrorDoc } from "./utils";
import { createParser } from "../../lang/Cql";

export const createEditorView = ({
  initialValue = "",
  mountEl,
  plugins,
  placeholder,
  parser,
}: {
  initialValue: string;
  mountEl: HTMLElement;
  plugins: Plugin[];
  placeholder?: string;
  parser: ReturnType<typeof createParser>;
}) => {
  const editorView = new EditorView(mountEl, {
    state: EditorState.create({
      doc: queryToProseMirrorDoc(initialValue, parser),
      schema,
      plugins: [
        ...plugins,
        ...(placeholder ? [createPlaceholderPlugin(placeholder)] : []),
        keymap({
          ...baseKeymap,
          "Mod-z": undo,
          "Mod-Shift-z": redo,
          "Mod-a": maybeSelectValue,
          "Mod-ArrowLeft": startOfLine,
          "Ctrl-ArrowLeft": startOfLine,
          "Ctrl-a": startOfLine,
          Home: startOfLine,
          "Mod-ArrowRight": endOfLine,
          "Ctrl-ArrowRight": endOfLine,
          "Ctrl-e": endOfLine,
          End: endOfLine,
        }),
        history(),
      ],
    }),
  });

  window.CQL_VIEW = editorView;

  const updateEditorView = (str: string) =>
    applyQueryStr(str, parser)(editorView.state, editorView.dispatch);

  endOfLine(editorView.state, editorView.dispatch);

  return { editorView: editorView, updateEditorView };
};
