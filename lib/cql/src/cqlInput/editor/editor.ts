import { EditorView } from "prosemirror-view";
import { Command, EditorState, Plugin } from "prosemirror-state";
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
  const isMac = window.navigator.platform.toLowerCase().indexOf("mac") !== -1;
  const platformKeys: {
    [key: string]: Command;
  } = isMac
    ? {
        "Mod-ArrowLeft": startOfLine,
        "Ctrl-ArrowLeft": startOfLine,
        "Mod-ArrowRight": endOfLine,
        "Ctrl-ArrowRight": endOfLine,
      }
    : {};

  const editorView = new EditorView(mountEl, {
    state: EditorState.create({
      doc: queryToProseMirrorDoc(initialValue, parser),
      schema,
      plugins: [
        ...plugins,
        ...(placeholder ? [createPlaceholderPlugin(placeholder)] : []),
        keymap({
          ...baseKeymap,
          ...platformKeys,
          "Mod-z": undo,
          "Mod-Shift-z": redo,
          "Mod-a": maybeSelectValue,
          "Ctrl-a": startOfLine,
          Home: startOfLine,
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
