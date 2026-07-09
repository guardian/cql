import { KeyBinding, Wordgard } from "wordgard/editor";
import { GardState } from "wordgard/state";
import { history, redo, undo } from "wordgard/history";
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
  plugins: GardState.Extension[];
  placeholder?: string;
  parser: ReturnType<typeof createParser>;
}) => {
  const isMac = window.navigator.platform.toLowerCase().indexOf("mac") !== -1;
  const platformKeyBindings: KeyBinding[] = isMac
    ? [
        // Ctrl-a/e move to start/end of para on Mac; as we have no paragraphs
        // here, start/end of line is sufficient
        KeyBinding.of({ key: "Ctrl-a", run: startOfLine }),
        KeyBinding.of({ key: "Ctrl-e", run: endOfLine }),
        KeyBinding.of({ key: "Mod-ArrowLeft", run: startOfLine }),
        KeyBinding.of({ key: "Mod-ArrowRight", run: endOfLine }),
        // This doesn't seem to be listed on https://support.apple.com/en-euro/102650,
        // but does work in other text editing contexts on Mac
        KeyBinding.of({ key: "Ctrl-ArrowLeft", run: startOfLine }),
        KeyBinding.of({ key: "Ctrl-ArrowRight", run: endOfLine }),
      ]
    : [
        KeyBinding.of({ key: "Home", run: startOfLine }),
        KeyBinding.of({ key: "End", run: endOfLine }),
      ];

  const editorView = Wordgard.create({
    parent: mountEl,
    doc: queryToProseMirrorDoc(initialValue, parser),
    config: [
      ...plugins,
      ...(placeholder ? [createPlaceholderPlugin(placeholder)] : []),
      ...platformKeyBindings,
      KeyBinding.of({ key: "Mod-z", run: undo }),
      KeyBinding.of({ key: "Mod-Shift-z", run: redo }),
      KeyBinding.of({ key: "Mod-a", run: maybeSelectValue }),
      // Set the content class declaratively rather than mutating
      // `contentDOM.classList` after construction: an attribute mutation on the
      // root content element makes wordgard's DOMObserver resolve a position on
      // the parent-less root tile, which throws.
      Wordgard.contentAttributes.of({ class: "Cql__ContentEditable" }),
      history(),
    ],
  });

  window.CQL_VIEW = editorView;

  const updateEditorView = (str: string) => {
    const spec = applyQueryStr(str, parser)(editorView, null);
    if (spec) {
      editorView.dispatch(spec);
    }
  };

  const endSpec = endOfLine(editorView, null);
  if (endSpec) {
    editorView.dispatch(endSpec);
  }

  return { editorView: editorView, updateEditorView };
};
