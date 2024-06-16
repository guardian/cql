import { EditorView } from "prosemirror-view";

declare global {
  interface Window {
    CQL_VIEW: EditorView | undefined;
  }
}
