import { EditorView } from "prosemirror-view";
import { EditorState, Plugin } from "prosemirror-state";
import { doc, schema, searchText } from "./schema";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { bottomOfLine, topOfLine } from "./commands";
import { docToQueryStr } from "./utils";

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
    dispatchTransaction(tr) {
      // Ensure that we always have space for text after the last wrapper node
      const endsWithChip = tr.doc.lastChild?.type.name === "chipWrapper";
      if (endsWithChip) {
        const tr = view.state.tr;
        tr.insert(
          view.state.doc.nodeSize - 2,
          schema.nodes.searchText.create(undefined)
        );
      }

      view.updateState(view.state.apply(tr));
    },
  });

  window.CQL_VIEW = view;

  return view;
};
