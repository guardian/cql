import { EditorView } from "prosemirror-view";
import { EditorState, Plugin } from "prosemirror-state";
import { doc, schema, queryStr } from "./schema";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { endOfLine, startOfLine } from "./commands";

export const createEditorView = ({
  initialValue = "",
  mountEl,
  plugins,
}: {
  initialValue: string;
  mountEl: HTMLElement;
  plugins: Plugin[];
}) => {
  const view = new EditorView(mountEl, {
    state: EditorState.create({
      doc: doc.create(undefined, [
        queryStr.create(
          undefined,
          [initialValue !== "" ? [schema.text(initialValue)] : []].flat(),
        ),
      ]),
      schema: schema,
      plugins: [
        ...plugins,
        keymap({
          ...baseKeymap,
          "Mod-z": undo,
          "Mod-y": redo,
          "Mod-ArrowLeft": startOfLine,
          "Ctrl-a": startOfLine,
          Home: startOfLine,
          "Mod-ArrowRight": endOfLine,
          "Ctrl-e": endOfLine,
          End: endOfLine,
        }),
        history(),
      ],
    }),
  });

  window.CQL_VIEW = view;

  return view;
};
