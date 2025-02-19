import { EditorView } from "prosemirror-view";
import { EditorState, Plugin } from "prosemirror-state";
import { doc, schema, searchText } from "./schema";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { bottomOfLine, topOfLine } from "./commands";

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
          ...baseKeymap,
          "Mod-z": undo,
          "Mod-y": redo,
          "Mod-ArrowLeft": topOfLine,
          "Ctrl-a": topOfLine,
          Home: topOfLine,
          "Mod-ArrowRight": bottomOfLine,
          "Ctrl-e": bottomOfLine,
          End: bottomOfLine,
        }),
        history(),
      ],
    }),
  });

  window.CQL_VIEW = view;

  return view;
};
