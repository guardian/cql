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
        // Ctrl-a/e move to start/end of para on Mac; as we have no paragraphs
        // here, start/end of line is sufficient
        "Ctrl-a": startOfLine,
        "Ctrl-e": endOfLine,
        "Mod-ArrowLeft": startOfLine,
        "Mod-ArrowRight": endOfLine,
        // This doesn't seem to be listed on https://support.apple.com/en-euro/102650,
        // but does work in other text editing contexts on Mac
        "Ctrl-ArrowLeft": startOfLine,
        "Ctrl-ArrowRight": endOfLine,
      }
    : {
        Home: startOfLine,
        End: endOfLine,
      };

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
