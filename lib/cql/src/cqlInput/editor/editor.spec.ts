import { describe, it, expect } from "bun:test";
import { createParser } from "../../lang/Cql";
import {
  createProseMirrorTokenToDocumentMap,
  docToCqlStr,
  toProseMirrorTokens,
} from "./utils";
import { createEditorView } from "./editor";
import { EditorView } from "prosemirror-view";
import { EditorState, TextSelection } from "prosemirror-state";

describe("updateEditorViewWithQueryStr", () => {
  const parser = createParser();
  const createEditorFromInitialState = (query: string) => {
    const mountEl = document.createElement("div");
    return createEditorView({
      initialValue: query,
      plugins: [],
      parser,
      mountEl,
    });
  };

  const getPosFromQueryPos = (pos: number, editor: EditorView) => {
    const query = docToCqlStr(editor.state.doc);
    const result = parser(query);
    const tokens = toProseMirrorTokens(result.tokens);
    const mapping = createProseMirrorTokenToDocumentMap(tokens);
    return mapping.map(pos);
  };

  const setQueryPosAsSelection = (pos: number, editorView: EditorView) => {
    const docPos = getPosFromQueryPos(pos, editorView);
    editorView.dispatch(
      editorView.state.tr.setSelection(
        TextSelection.near(editorView.state.doc.resolve(docPos)),
      ),
    );
  };

  /**
   * Adds the current selection anchor (^) and head ($) to the document, and
   * returns the CQL str the document represents. For example, a document
   * `+tag:a` with the selection `AllSelection` would return `^+tag:a$`.
   */
  const docToCqlStrWithSelection = (state: EditorState) => {
    const tr = state.tr;
    const newState = state.apply(
      tr.insertText("^", tr.selection.from).insertText("$", tr.selection.to),
    );
    return docToCqlStr(newState.doc);
  };

  it("should create a document in the correct state", () => {
    const { editorView } = createEditorFromInitialState("+tag:a");

    expect(docToCqlStr(editorView.state.doc)).toEqual("+tag:a ");
  });

  it("should update a document with the new state", () => {
    const { editorView, updateEditorView } =
      createEditorFromInitialState("+tag:a");

    updateEditorView("+tag:a b");

    expect(docToCqlStr(editorView.state.doc)).toEqual("+tag:a b");
  });

  it("should preserve the selection state insofar as possible", () => {
    const initialQuery = "+tag:x";
    const { editorView, updateEditorView } =
      createEditorFromInitialState(initialQuery);
    setQueryPosAsSelection(initialQuery.indexOf("x"), editorView);

    expect(docToCqlStrWithSelection(editorView.state)).toEqual("+tag:^$x ");

    updateEditorView("+tag:x b ");

    expect(docToCqlStrWithSelection(editorView.state)).toEqual("+tag:^$x b ");
  });
});
