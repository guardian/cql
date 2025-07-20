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
import { createCqlPlugin } from "./plugins/cql";
import { TestTypeaheadHelpers } from "../../lang/fixtures/TestTypeaheadHelpers";
import { Typeahead } from "../../lib";

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

/**
 * Adds the current selection anchor (^) and head ($) to the document, and
 * returns the CQL str the document represents. For example, a document
 * `+tag:a` with the selection `AllSelection` would return `^+tag:a$`.
 */
const docToCqlStrWithSelection = (_state: EditorState) => {
  const state = _state.reconfigure({ plugins: [] });
  const tr = state.tr;
  const newState = state.apply(
    tr.insertText("^", tr.selection.from).insertText("$", tr.selection.to),
  );
  return docToCqlStr(newState.doc);
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

describe("paste behaviour", () => {
  const pasteContent = (
    view: EditorView,
    data: { payload: string; type: string }[],
  ) => {
    const clipboardData = new DataTransfer();
    data.forEach(({ payload, type }) => {
      clipboardData.setData(type, payload);
    });
    const event = new ClipboardEvent("paste", { clipboardData });

    view.pasteHTML(data[0].payload, event);
  };

  it(`should preserve the selection state on paste into a blank document for data type "text/plain"`, () => {
    const { editorView } = createEditorFromInitialState("");
    const payload = "+tag:example";

    pasteContent(editorView, [{ payload, type: "text/plain" }]);

    expect(docToCqlStrWithSelection(editorView.state)).toEqual(
      "+tag:example ^$",
    );
  });

  it(`should preserve the selection state on paste for data type "text/plain" before text`, () => {
    const { editorView } = createEditorFromInitialState("text");
    editorView.dispatch(
      editorView.state.tr.setSelection(
        TextSelection.near(editorView.state.doc.resolve(0)),
      ),
    );
    const payload = "+tag:example";

    pasteContent(editorView, [{ payload, type: "text/plain" }]);

    expect(docToCqlStrWithSelection(editorView.state)).toEqual(
      "+tag:example ^$text",
    );
  });

  it(`should preserve the selection state on paste for data type "text/plain" in middle of text`, () => {
    const { editorView } = createEditorFromInitialState("a  b");
    editorView.dispatch(
      editorView.state.tr.setSelection(
        TextSelection.near(editorView.state.doc.resolve(3)),
      ),
    );
    const payload = "start +tag:example end";

    pasteContent(editorView, [{ payload, type: "text/plain" }]);

    expect(docToCqlStrWithSelection(editorView.state)).toEqual(
      "a start +tag:example end^$ b",
    );
  });

  it(`should preserve the selection state on paste for data type "text/plain" after text`, () => {
    const { editorView } = createEditorFromInitialState("text ");
    const payload = "+tag:example";

    pasteContent(editorView, [{ payload, type: "text/plain" }]);

    expect(docToCqlStrWithSelection(editorView.state)).toEqual(
      "text +tag:example ^$",
    );
  });

  it(`should preserve the selection state on paste for data type "text/html"`, () => {
    const { editorView } = createEditorFromInitialState("text ");
    const payload = `<meta charset='utf-8'><query-str data-pm-slice="0 0 []"></query-str><chip data-polarity="+"><chip-key>tag</chip-key><chip-value>type/article</chip-value></chip><query-str></query-str>`;

    pasteContent(editorView, [{ payload, type: "text/html" }]);

    expect(docToCqlStrWithSelection(editorView.state)).toEqual(
      "text +tag:type/article ^$",
    );
  });

  it(`should not use HTML that does not contain ProseMirror markup as HTML`, () => {
    const { editorView } = createEditorFromInitialState("");
    const htmlPayload = "html";
    const textPayload = "this then that";

    pasteContent(editorView, [
      { payload: htmlPayload, type: "text/html" },
      { payload: textPayload, type: "text/plain" },
    ]);

    expect(docToCqlStr(editorView.state.doc)).toEqual(textPayload);
  });
});
