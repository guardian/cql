import { EditorView } from "prosemirror-view";
import { AllSelection, EditorState, Plugin } from "prosemirror-state";
import { doc, schema, queryStr } from "./schema";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { endOfLine, maybeSelectValue, startOfLine } from "./commands";
import { createPlaceholderPlugin } from "./plugins/placeholder";

/**
 * Create a basic document from the given string, representing the entire query
 * as a `queryStr`. When added to a document running the CQL plugin, the plugin
 * will hydrate this string into a proper query.
 */
export const createBasicDocFromStr = (str: string) =>
  doc.create(undefined, [
    queryStr.create(undefined, [str !== "" ? [schema.text(str)] : []].flat()),
  ]);

export const createEditorView = ({
  initialValue = "",
  mountEl,
  plugins,
  placeholder,
}: {
  initialValue: string;
  mountEl: HTMLElement;
  plugins: Plugin[];
  placeholder?: string;
}) => {
  const editorView = new EditorView(mountEl, {
    state: EditorState.create({
      doc: createBasicDocFromStr(initialValue),
      schema: schema,
      plugins: [
        ...plugins,
        ...(placeholder ? [createPlaceholderPlugin(placeholder)] : []),
        keymap({
          ...baseKeymap,
          "Mod-z": undo,
          "Mod-y": redo,
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

  const update = (str: string) => {
    const doc = createBasicDocFromStr(str);

    const { from, to } = new AllSelection(editorView.state.tr.doc);
    const tr = editorView.state.tr.replaceRangeWith(from, to, doc);
    editorView.dispatch(tr);
  };

  return { editorView: editorView, updateEditorView: update };
};
