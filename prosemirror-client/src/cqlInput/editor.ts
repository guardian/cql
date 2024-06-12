import { EditorView } from "prosemirror-view";
import { CqlService } from "../CqlService";
import { createCqlPlugin } from "./plugin";
import { EditorState } from "prosemirror-state";
import { doc, schema, searchText } from "./schema";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";

declare module window {
  export let CQL_VIEW: EditorView;
}

const initialContent = doc.create(undefined, [
  searchText.create(undefined, [schema.text("example")]),
]);

export const createEditor = (
  mountEl: HTMLElement,
  popoverEl: HTMLElement,
  cqlService: CqlService
) => {
  const plugin = createCqlPlugin(cqlService, popoverEl);
  const view = new EditorView(mountEl, {
    state: EditorState.create({
      doc: initialContent,
      schema: schema,
      plugins: [plugin, keymap(baseKeymap)],
    }),
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr));

      if (view.state.doc.lastChild?.type.name === "chipWrapper") {
        const tr = view.state.tr;
        tr.insert(
          view.state.doc.nodeSize - 2,
          schema.nodes.searchText.create(undefined, schema.text(" "))
        );
        view.updateState(view.state.apply(tr));
      }
    },
    handleDOMEvents: {
      focusin(view, event) {
        console.log("focus", view, event.target);
      },
    },
  });

  window.CQL_VIEW = view;
};
