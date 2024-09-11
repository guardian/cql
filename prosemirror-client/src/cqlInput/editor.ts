import { EditorView } from "prosemirror-view";
import { CqlServiceInterface } from "../services/CqlService";
import { createCqlPlugin } from "./plugin";
import { EditorState } from "prosemirror-state";
import { doc, schema, searchText } from "./schema";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { QueryChangeEventDetail } from "./dom";
import { bottomOfLine, topOfLine } from "./commands";

declare module window {
  export let CQL_VIEW: EditorView;
}

export const createEditor = ({
  initialValue = "",
  mountEl,
  typeaheadEl,
  errorEl,
  errorMsgEl,
  debugEl,
  cqlService,
  onChange,
}: {
  initialValue: string;
  mountEl: HTMLElement;
  typeaheadEl: HTMLElement;
  errorEl: HTMLElement;
  errorMsgEl: HTMLElement;
  cqlService: CqlServiceInterface;
  onChange: (detail: QueryChangeEventDetail) => void;
  debugEl?: HTMLElement;
}) => {
  const plugin = createCqlPlugin({
    cqlService,
    typeaheadEl,
    errorEl,
    errorMsgEl,
    onChange,
    debugEl,
  });
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
        plugin,
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
      view.updateState(view.state.apply(tr));

      // Ensure that we always have space for text after the last wrapper node
      const endsWithChip =
        view.state.doc.lastChild?.type.name === "chipWrapper";
      if (endsWithChip) {
        const tr = view.state.tr;
        tr.insert(
          view.state.doc.nodeSize - 2,
          schema.nodes.searchText.create(undefined)
        );
        view.updateState(view.state.apply(tr));
      }
    },
  });

  window.CQL_VIEW = view;

  return view.dom;
};
