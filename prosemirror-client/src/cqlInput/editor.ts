import { EditorView } from "prosemirror-view";
import { EditorState, Plugin } from "prosemirror-state";
import { doc, schema, searchText } from "./schema";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { bottomOfLine, topOfLine } from "./commands";

declare module window {
  export let CQL_VIEW: EditorView;
}

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
        searchText.create(
          undefined,
          [initialValue !== "" ? [schema.text(initialValue)] : []].flat()
        ),
      ]),
      schema: schema,
      plugins: [
        ...plugins,
        keymap({
          "Mod-z": undo,
          "Mod-y": redo,
          "Ctrl-a": topOfLine,
          "Ctrl-e": bottomOfLine,
        }),
        keymap(baseKeymap),
        history(),
      ],
    }),
  });

  window.CQL_VIEW = view;

  return view;
};
