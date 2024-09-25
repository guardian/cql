import { describe, it, beforeEach } from "bun:test";
import { errorMsgTestId, errorTestId, typeaheadTestId } from "./CqlInput";
import { findByTestId, findByText } from "@testing-library/dom";
import { CqlClientService } from "../services/CqlService";
import { TestTypeaheadHelpers } from "../lang/typeaheadHelpersTest";
import { createEditor, ProsemirrorTestChain } from "jest-prosemirror";
import { createCqlPlugin } from "./plugin";
import { redo, undo } from "prosemirror-history";
import { bottomOfLine, topOfLine } from "./commands";
import { keymap } from "prosemirror-keymap";
import {
  createProseMirrorTokenToDocumentMap,
  docToQueryStr,
  mapResult,
  tokensToDoc,
  toProseMirrorTokens,
} from "./utils";
import { TextSelection } from "prosemirror-state";

const typeheadHelpers = new TestTypeaheadHelpers();
const testCqlService = new CqlClientService(typeheadHelpers.fieldResolvers);

const createCqlEditor = async (initialQuery: string = "") => {
  const container = document.createElement("div");
  const typeaheadEl = document.createElement("div");
  typeaheadEl.setAttribute("data-testid", typeaheadTestId);
  const errorEl = document.createElement("div");
  errorEl.setAttribute("data-testid", errorTestId);
  const errorMsgEl = document.createElement("div");
  errorMsgEl.setAttribute("data-testid", errorMsgTestId);

  container.appendChild(typeaheadEl);
  container.appendChild(errorEl);
  container.appendChild(errorMsgEl);

  const plugin = createCqlPlugin({
    cqlService: testCqlService,
    typeaheadEl,
    errorEl,
    errorMsgEl,
    config: { syntaxHighlighting: true },
    onChange: ({ cqlQuery }) => dispatch(cqlQuery),
  });

  const queryToProseMirrorTokens = async (query: string) => {
    const result = await testCqlService.fetchResult(query);
    const { tokens } = mapResult(result);
    return tokensToDoc(tokens);
  };

  const moveCaretToQueryPos = async (pos: number) => {
    const query = docToQueryStr(editor.view.state.doc);
    const result = await testCqlService.fetchResult(query);
    const tokens = toProseMirrorTokens(result.tokens);
    const mapping = createProseMirrorTokenToDocumentMap(tokens);
    return editor.command((state, dispatch) => {
      dispatch?.(
        state.tr.setSelection(
          TextSelection.near(state.doc.resolve(mapping.map(pos)))
        )
      );

      return true;
    });
  };

  const doc = await queryToProseMirrorTokens(initialQuery);

  const editor = createEditor(doc, {
    plugins: [
      plugin,
      keymap({
        "Mod-z": undo,
        "Mod-y": redo,
        "Ctrl-a": topOfLine,
        "Ctrl-e": bottomOfLine,
      }),
    ],
  });

  editor.selectText('end')

  container.appendChild(editor.view.dom);

  const subscribers: Array<(s: string) => void> = [];
  const valuesReceived: string[] = [];
  const dispatch = (value: string) => {
    valuesReceived.push(value);
    subscribers.forEach((s) => s(value));
  };

  /**
   * Wait for a particular `cqlQuery` value from the component's onChange
   * handler. Fail after the specified timeout if no matching value is found.
   */
  const waitFor = (value: string, timeoutMs = 1000) =>
    new Promise<void>((res, rej) => {
      if (valuesReceived.includes(value)) {
        return res();
      }

      const onQueryChange = (s: string) => {
        if (s === value) {
          res();
        }
      };

      subscribers.push(onQueryChange);

      setTimeout(() => {
        rej(
          `Expected ${value}, but got ${
            valuesReceived.length ? valuesReceived.join(",") : "<no values>"
          }`
        );
      }, timeoutMs);
    });

  return { editor, waitFor, container, moveCaretToQueryPos };
};

const selectPopoverOption = async (
  editor: ProsemirrorTestChain,
  container: HTMLElement,
  optionLabel: string
) => {
  const popoverContainer = await findByTestId(container, typeaheadTestId);
  await findByText(popoverContainer, optionLabel);
  await editor.press("Enter");
};

describe("CqlInput", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("input", () => {
    it("accepts and displays a basic query", async () => {
      const { editor, waitFor } = await createCqlEditor();

      await editor.insertText("example");

      await waitFor("example");
    });

    it("accepts whitespace after non-string tokens", async () => {
      const { editor, waitFor } = await createCqlEditor("a AND");

      await editor.insertText(" ");

      await waitFor("a AND ");
    });
  });

  describe("typeahead", () => {
    describe("chip keys", () => {
      it("displays a popover at the start of a query", async () => {
        const { editor, container } = await createCqlEditor();

        await editor.insertText("example +");

        const popoverContainer = await findByTestId(container, typeaheadTestId);

        await findByText(popoverContainer, "Tag");
        await findByText(popoverContainer, "Section");
      });

      it("displays a popover after search text", async () => {
        const { editor, container } = await createCqlEditor();

        await editor.insertText("+");

        const popoverContainer = await findByTestId(container, typeaheadTestId);

        await findByText(popoverContainer, "Tag");
        await findByText(popoverContainer, "Section");
      });

      it("displays a popover after another chip", async () => {
        const { editor, container } = await createCqlEditor("+tag:a");

        editor.insertText(" +");

        const popoverContainer = await findByTestId(container, typeaheadTestId);

        await findByText(popoverContainer, "Tag");
        await findByText(popoverContainer, "Section");
      });

      it("applies the given key when a popover option is selected", async () => {
        const { editor, container, waitFor } = await createCqlEditor();
        await editor.insertText("example +");

        await waitFor("example +");

        await selectPopoverOption(editor, container, "Tag");

        await waitFor("example +tag");
      });
    });

    describe("chip values", () => {
      it("displays a popover at the start of a query", async () => {
        const queryStr = "example +tag";
        const { editor, container, moveCaretToQueryPos } =
          await createCqlEditor("example +tag");

        await moveCaretToQueryPos(queryStr.length);
        await editor.insertText("t");

        const popoverContainer = await findByTestId(container, typeaheadTestId);

        await findByText(popoverContainer, "Tags are magic");
      });

      it("applies the given key when a popover option is selected", async () => {
        const queryStr = "example +tag";
        const { editor, container, waitFor, moveCaretToQueryPos } =
          await createCqlEditor("example +tag");

        await moveCaretToQueryPos(queryStr.length);
        await editor.insertText("t");
        await selectPopoverOption(editor, container, "Tags are magic");

        await waitFor("example +tag:tags-are-magic ");
      });
    });
  });

  describe("caret movement and selection", () => {
    it("ctrl-a moves the caret to the beginning of the input", async () => {
      const { editor, waitFor } = await createCqlEditor();

      await editor.insertText("a").shortcut("Ctrl-a").insertText("b");

      await waitFor("ba");
    });

    it("ctrl-e moves the caret to the end of the input", async () => {
      const { editor, waitFor } = await createCqlEditor();

      await editor
        .insertText("a")
        .selectText("start")
        .shortcut("Ctrl-e")
        .insertText("b");

      await waitFor("ab");
    });

    it("permits content before query fields", async () => {
      const { editor, waitFor } = await createCqlEditor();

      await editor.insertText("+tag").shortcut("Ctrl-a").insertText("a ");

      await waitFor("a +tag");
    });
  });
});
