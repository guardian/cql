import { describe, it, expect } from "bun:test";
import { createParser } from "../../lang/Cql";
import {
  createProseMirrorTokenToDocumentMap,
  docToCqlStr,
  toProseMirrorTokens,
} from "./utils";
import { createEditorView } from "./editor";
import { EditorView } from "prosemirror-view";
import { TextSelection } from "prosemirror-state";
import { createCqlPlugin } from "./plugins/cql";
import { TestTypeaheadHelpers } from "../../lang/fixtures/TestTypeaheadHelpers";
import { Typeahead } from "../../lib";
import { docToCqlStrWithSelection } from "../../utils/test";

const typeheadHelpers = new TestTypeaheadHelpers();
const testCqlService = new Typeahead(typeheadHelpers.typeaheadFields);

const parser = createParser();
const createEditorFromInitialState = (query: string) => {
  const mountEl = document.createElement("div");
  const typeaheadEl = document.createElement("div");
  const errorEl = document.createElement("div");

  const cqlPlugin = createCqlPlugin({
    typeahead: testCqlService,
    typeaheadEl,
    errorEl,
    config: { syntaxHighlighting: true },
    onChange: () => {},
    parser,
  });

  return createEditorView({
    initialValue: query,
    plugins: [cqlPlugin],
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

describe("updateEditorViewWithQueryStr", () => {
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

  it("should preserve the selection state insofar as possible - editing queryStr before selection", () => {
    const initialQuery = "+tag:x";
    const { editorView, updateEditorView } =
      createEditorFromInitialState(initialQuery);
    setQueryPosAsSelection(initialQuery.indexOf("x"), editorView);

    expect(docToCqlStrWithSelection(editorView.state)).toEqual("+tag:^$x ");

    updateEditorView("a +tag:x ");

    expect(docToCqlStrWithSelection(editorView.state)).toEqual("a +tag:^$x ");
  });

  it("should preserve the selection state insofar as possible - editing queryStr after selection", () => {
    const initialQuery = "+tag:x";
    const { editorView, updateEditorView } =
      createEditorFromInitialState(initialQuery);
    setQueryPosAsSelection(initialQuery.indexOf("x"), editorView);

    expect(docToCqlStrWithSelection(editorView.state)).toEqual("+tag:^$x ");

    updateEditorView("+tag:x b ");

    expect(docToCqlStrWithSelection(editorView.state)).toEqual("+tag:^$x b ");
  });

  it("should preserve the selection state insofar as possible - editing tag before selection", () => {
    const initialQuery = "+tag:x";
    const { editorView, updateEditorView } =
      createEditorFromInitialState(initialQuery);
    setQueryPosAsSelection(initialQuery.indexOf("x"), editorView);

    expect(docToCqlStrWithSelection(editorView.state)).toEqual("+tag:^$x ");

    updateEditorView("+tag:y +tag:x ");

    expect(docToCqlStrWithSelection(editorView.state)).toEqual(
      "+tag:y +tag:^$x ",
    );
  });

  it("should preserve the selection state insofar as possible - editing tag after selection", () => {
    const initialQuery = "+tag:x";
    const { editorView, updateEditorView } =
      createEditorFromInitialState(initialQuery);
    setQueryPosAsSelection(initialQuery.indexOf("x"), editorView);

    expect(docToCqlStrWithSelection(editorView.state)).toEqual("+tag:^$x ");

    updateEditorView("+tag:x +tag:y ");

    expect(docToCqlStrWithSelection(editorView.state)).toEqual(
      "+tag:^$x +tag:y ",
    );
  });

  it("should preserve the selection state insofar as possible - adding tag", () => {
    const initialQuery = "tag:";
    const { editorView, updateEditorView } =
      createEditorFromInitialState(initialQuery);
    setQueryPosAsSelection(initialQuery.length, editorView);

    expect(docToCqlStrWithSelection(editorView.state)).toEqual("+tag:^$ ");

    updateEditorView("+tag:");

    expect(docToCqlStrWithSelection(editorView.state)).toEqual("+tag:^$ ");
  });
});
