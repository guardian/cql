import { describe, it, beforeEach, expect } from "bun:test";
import { errorMsgTestId, errorTestId, typeaheadTestId } from "../CqlInput";
import { findByTestId, findByText, fireEvent } from "@testing-library/dom";
import { CqlClientService } from "../../services/CqlService";
import { createEditor, ProsemirrorTestChain } from "jest-prosemirror";
import { createCqlPlugin } from "./plugin";
import { redo, undo } from "prosemirror-history";
import { bottomOfLine, topOfLine } from "./commands";
import { keymap } from "prosemirror-keymap";
import {
  createProseMirrorTokenToDocumentMap,
  docToQueryStr,
  getNodeTypeAtSelection,
  mapResult,
  tokensToDoc,
  toProseMirrorTokens,
} from "./utils";
import { TextSelection } from "prosemirror-state";
import { TestTypeaheadHelpers } from "../../lang/fixtures/TestTypeaheadHelpers";

const typeheadHelpers = new TestTypeaheadHelpers();
const testCqlService = new CqlClientService(typeheadHelpers.fieldResolvers);

const createCqlEditor = (initialQuery: string = "") => {
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

  const subscribers: Array<(s: string) => void> = [];
  const valuesReceived: string[] = [];
  const dispatch = (value: string) => {
    valuesReceived.push(value);
    subscribers.forEach((s) => s(value));
  };

  const plugin = createCqlPlugin({
    cqlService: testCqlService,
    typeaheadEl,
    errorEl,
    errorMsgEl,
    config: { syntaxHighlighting: true },
    onChange: ({ cqlQuery }) => dispatch(cqlQuery),
  });

  const queryToProseMirrorTokens = (query: string) => {
    const result = testCqlService.parseCqlQueryStr(query);
    const { tokens } = mapResult(result);
    return tokensToDoc(tokens);
  };

  const moveCaretToQueryPos = (pos: number, offset: number = 0) => {
    const query = docToQueryStr(editor.view.state.doc);
    const result = testCqlService.parseCqlQueryStr(query);
    const tokens = toProseMirrorTokens(result.tokens);
    const mapping = createProseMirrorTokenToDocumentMap(tokens);
    return editor.command((state, dispatch) => {
      dispatch?.(
        state.tr.setSelection(
          TextSelection.near(state.doc.resolve(mapping.map(pos) + offset))
        )
      );

      return true;
    });
  };

  const doc = queryToProseMirrorTokens(initialQuery);

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

  editor.selectText("end");

  container.appendChild(editor.view.dom);

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
          `Expected '${value}', but got '${
            valuesReceived.length ? valuesReceived.join(",") : "<no values>"
          }'`
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

describe("plugin", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("input", () => {
    it("accepts and displays a basic query", async () => {
      const { editor, waitFor } = createCqlEditor();

      await editor.insertText("example");

      await waitFor("example");
    });

    it("accepts whitespace after non-string tokens", async () => {
      const { editor, waitFor } = createCqlEditor("a AND");

      await editor.insertText(" ");

      await waitFor("a AND ");
    });
  });

  describe("typeahead", () => {
    describe("chip keys", () => {
      it("displays a popover at the start of a query", async () => {
        const { editor, container } = createCqlEditor();

        await editor.insertText("example +");

        const popoverContainer = await findByTestId(container, typeaheadTestId);

        await findByText(popoverContainer, "Tag");
        await findByText(popoverContainer, "Section");
      });

      it("displays a popover after search text, moving the caret to key position", async () => {
        const { editor, container } = createCqlEditor();

        await editor.insertText("+");

        const nodeAtCaret = getNodeTypeAtSelection(editor.view);
        expect(nodeAtCaret.name).toBe("chipKey");

        const popoverContainer = await findByTestId(container, typeaheadTestId);

        await findByText(popoverContainer, "Tag");
        await findByText(popoverContainer, "Section");
      });

      it("displays a popover after another chip", async () => {
        const { editor, container } = createCqlEditor("+tag:a");

        editor.insertText("+");

        const nodeAtCaret = getNodeTypeAtSelection(editor.view);
        expect(nodeAtCaret.name).toBe("chipKey");

        const popoverContainer = await findByTestId(container, typeaheadTestId);

        await findByText(popoverContainer, "Tag");
        await findByText(popoverContainer, "Section");
      });

      it("applies the given key when a popover option is selected", async () => {
        const { editor, container, waitFor } = createCqlEditor();
        await editor.insertText("example +");

        await selectPopoverOption(editor, container, "Tag");
        const nodeAtCaret = getNodeTypeAtSelection(editor.view);
        expect(nodeAtCaret.name).toBe("chipValue");

        await waitFor("example +tag: ");
      });

      it("applies the given key when a popover option is selected at the start of the query", async () => {
        const { editor, container, waitFor } = createCqlEditor();
        await editor.insertText("+");

        await selectPopoverOption(editor, container, "Tag");

        await waitFor("+tag: ");
      });

      it("displays a popover after another chip", async () => {
        const { editor, container, waitFor } = createCqlEditor("+tag:a");

        editor.insertText("+");

        const nodeAtCaret = getNodeTypeAtSelection(editor.view);
        expect(nodeAtCaret.name).toBe("chipKey");

        const popoverContainer = await findByTestId(container, typeaheadTestId);

        await findByText(popoverContainer, "Tag");
        await findByText(popoverContainer, "Section");
        await selectPopoverOption(editor, container, "Tag");

        await waitFor("+tag:a +tag: ");
      });
    });

    describe("chip values", () => {
      it("displays a popover at the start of a value field", async () => {
        const queryStr = "example +tag";
        const { editor, container, moveCaretToQueryPos } =
          createCqlEditor("example +tag");

        await moveCaretToQueryPos(queryStr.length);
        await editor.insertText("t");

        const popoverContainer = await findByTestId(container, typeaheadTestId);

        await findByText(popoverContainer, "Tags are magic");
      });

      it("applies the given key when a popover option is selected", async () => {
        const queryStr = "example +tag";
        const { editor, container, waitFor, moveCaretToQueryPos } =
          createCqlEditor("example +tag");

        await moveCaretToQueryPos(queryStr.length);
        await editor.insertText("t");
        await selectPopoverOption(editor, container, "Tags are magic");

        await waitFor("example +tag:tags-are-magic ");
      });

      it("inserts a chip before a string", async () => {
        const { editor, waitFor } = createCqlEditor("a");

        await editor.selectText(1).insertText("+");

        await waitFor("+: a");
      });

      it("inserts a single whitespace between chips", async () => {
        const { editor, waitFor } = createCqlEditor(
          "+tag:+tag:tags-are-magic "
        );

        await editor.insertText("+");

        await waitFor("+tag:+tag:tags-are-magic +: ");
      });
    });
  });

  describe("chip behaviour", () => {
    it("should not de-chip text if the searchText between chips is removed", async () => {
      const queryStr = "+tag:a b +tag:c";
      const { editor, moveCaretToQueryPos, waitFor } =
        createCqlEditor(queryStr);

      await moveCaretToQueryPos(queryStr.indexOf("b"), 1);
      await editor.backspace();

      await waitFor("+tag:a +tag:c ");
    });

    it("should make chip keys read only when the selection does not fall within their content", async () => {
      const queryStr = "a +tag:b c";
      const { container } = createCqlEditor(queryStr);

      const chipKey = await findByText(container, "tag");

      expect(chipKey.isContentEditable).toBe(false);
    });
  });

  describe("caret movement and selection", () => {
    it("ctrl-a moves the caret to the beginning of the input", async () => {
      const { editor, waitFor } = createCqlEditor();

      await editor.insertText("a").shortcut("Ctrl-a").insertText("b");

      await waitFor("ba");
    });

    it("ctrl-e moves the caret to the end of the input", async () => {
      const { editor, waitFor } = createCqlEditor();

      await editor
        .insertText("a")
        .selectText("start")
        .shortcut("Ctrl-e")
        .insertText("b");

      await waitFor("ab");
    });

    it("permits content before query fields", async () => {
      const { editor, waitFor } = createCqlEditor("+tag");

      await editor.insertText("b").shortcut("Ctrl-a").insertText("a");

      await waitFor("a +tag: b");
    });

    it("permits additional query fields before query fields", async () => {
      const { editor, waitFor } = createCqlEditor("+2");

      await editor.shortcut("Ctrl-a").insertText("+1");

      await waitFor("+1: +2: ");
    });
  });

  describe("deletion", () => {
    it("puts the chip in a pending state before deletion - keyboard", async () => {
      const { editor, waitFor } = createCqlEditor("+tag:a");

      await editor.press("Backspace");

      await waitFor("+tag:a ");
    });

    it("puts the chip in a pending state before deletion - mouse", async () => {
      const { editor, waitFor } = createCqlEditor("+tag:a");

      const deleteBtn = await findByText(editor.view.dom, "×");
      await fireEvent.click(deleteBtn);

      await waitFor("+tag:a ");
    });

    it("removes the chip via backspace", async () => {
      const { editor, waitFor } = createCqlEditor("+tag:a");

      await editor.press("Backspace").press("Backspace");

      await waitFor("");
    });

    it("removes the chip via delete", async () => {
      const { editor, waitFor } = createCqlEditor("+tag:a");

      await editor.selectText("start").press("Delete").press("Delete");

      await waitFor("");
    });

    it("removes the chips via click", async () => {
      const { editor, waitFor } = createCqlEditor("+tag:a");

      const deleteBtn = await findByText(editor.view.dom, "×");
      await fireEvent.click(deleteBtn);
      await fireEvent.click(deleteBtn);

      await waitFor("");
    });
  });
});
