import { describe, it, beforeEach, expect } from "bun:test";
import {
  CqlConfig,
  errorMsgTestId,
  errorTestId,
  typeaheadTestId,
} from "../../CqlInput";
import {
  findByTestId,
  findByText,
  fireEvent,
  getByTestId,
} from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { createEditor, ProsemirrorTestChain } from "jest-prosemirror";
import {
  createCqlPlugin,
  TEST_ID_CHIP_VALUE,
  TEST_ID_POLARITY_HANDLE,
} from "./cql";
import { redo, undo } from "prosemirror-history";
import { endOfLine, maybeSelectValue, startOfLine } from "../commands";
import { keymap } from "prosemirror-keymap";
import {
  createProseMirrorTokenToDocumentMap,
  docToCqlStr,
  findNodeAt,
  getNodeTypeAtSelection,
  queryToProseMirrorDoc,
  toProseMirrorTokens,
} from "../utils";
import { AllSelection, TextSelection } from "prosemirror-state";
import { TestTypeaheadHelpers } from "../../../lang/fixtures/TestTypeaheadHelpers";
import { isVisibleDataAttr } from "../../popover/Popover";
import { docToCqlStrWithSelection, tick } from "../../../utils/test";
import { createParser } from "../../../lang/Cql";
import { Typeahead } from "../../../lang/typeahead";
import { chip, chipValue, IS_SELECTED } from "../schema";
import { Node, NodeType } from "prosemirror-model";
import { cqlQueryStrFromQueryAst } from "../../../lang/interpreter";
import { EditorView } from "prosemirror-view";

const typeheadHelpers = new TestTypeaheadHelpers();
const testCqlService = new Typeahead(typeheadHelpers.typeaheadFields);

const createCqlEditor = (
  initialQuery: string = "",
  config: CqlConfig = { syntaxHighlighting: false },
) => {
  document.body.innerHTML = "";
  const container = document.body;
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

  const parser = createParser();

  const plugin = createCqlPlugin({
    typeahead: testCqlService,
    typeaheadEl,
    errorEl,
    config,
    onChange: ({ queryAst }) =>
      dispatch(queryAst ? cqlQueryStrFromQueryAst(queryAst) : ""),
    parser,
  });

  const getPosFromQueryPos = (pos: number) => {
    const query = docToCqlStr(editor.view.state.doc);
    const result = parser(query);
    const tokens = toProseMirrorTokens(result.tokens);
    const mapping = createProseMirrorTokenToDocumentMap(tokens);
    return mapping.map(pos);
  };

  const moveCaretToQueryPos = (queryPos: number, offset: number = 0) => {
    const pos = getPosFromQueryPos(queryPos);
    return editor.command((state, dispatch) => {
      dispatch?.(
        state.tr.setSelection(TextSelection.create(state.doc, pos + offset)),
      );

      return true;
    });
  };

  const doc = queryToProseMirrorDoc(initialQuery, parser);

  const editor = createEditor(doc, {
    plugins: [
      plugin,
      keymap({
        "Cmd-a": maybeSelectValue,
        "Mod-z": undo,
        "Mod-y": redo,
        "Ctrl-a": startOfLine,
        "Ctrl-e": endOfLine,
      }),
    ],
  });

  editor.selectText("end");

  container.appendChild(editor.view.dom);
  editor.view.focus();

  /**
   * Wait for a particular `cqlQuery` value from the component's onChange
   * handler. Fail after the specified timeout if no matching value is found.
   */
  const waitFor = (value: string, timeoutMs = 100) =>
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
          }'`,
        );
      }, timeoutMs);
    });

  const user = userEvent.setup();

  return {
    editor,
    waitFor,
    container,
    moveCaretToQueryPos,
    getPosFromQueryPos,
    queryToProseMirrorDoc,
    user,
  };
};

const selectPopoverOption = async (
  container: HTMLElement,
  optionLabel: string,
) => {
  const popoverContainer = await findByTestId(container, typeaheadTestId);
  return await findByText(popoverContainer, optionLabel);
};

const selectPopoverOptionWithClick = async (
  container: HTMLElement,
  optionLabel: string,
) => {
  const option = await selectPopoverOption(container, optionLabel);
  await fireEvent.click(option);
};

const selectPopoverOptionWithEnter = async (
  editor: ProsemirrorTestChain,
  container: HTMLElement,
  optionLabel: string,
) => {
  await selectPopoverOption(container, optionLabel);
  await editor.press("Enter");
};

const assertPopoverVisibility = async (
  container: HTMLElement,
  isVisible: boolean,
) => {
  await tick(); // Sometimes seems to be necessary to permit the popover to update after edit ops
  const popoverContainer = await findByTestId(container, typeaheadTestId);

  expect(popoverContainer.dataset[isVisibleDataAttr]).toBe(
    isVisible ? "true" : "false",
  );
};

describe("cql plugin", () => {
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

      await editor.insertText(" b");

      await waitFor("a AND b");
    });
  });

  describe("typeahead", () => {
    describe("chip keys", () => {
      it("displays a colon between chip keys and values on first render", async () => {
        const queryStr = "+x:y";
        const { container } = createCqlEditor(queryStr);

        const colonSeparator = await findByText(container, ":");

        expect(colonSeparator).toBeTruthy();
      });

      it("selects the key, then the whole query, when Mod-a is pressed", async () => {
        const queryStr = "str +x:y str";
        const { editor, getPosFromQueryPos } = createCqlEditor(queryStr);
        const keyPosInQuery = queryStr.indexOf("y");
        const keyPosInDoc = getPosFromQueryPos(keyPosInQuery);

        await editor.selectText(keyPosInDoc);
        await editor.shortcut("Cmd-a");

        expect(editor.selection.from).toBe(keyPosInDoc);
        expect(editor.selection.to).toBe(keyPosInDoc + 1);

        await editor.shortcut("Cmd-a");

        expect(editor.selection.from).toBe(0);
        expect(editor.selection.to).toBe(editor.state.doc.content.size);
      });

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

      it("dismisses the popover when the escape key is pressed", async () => {
        const { editor, container } = createCqlEditor();
        const popoverContainer = await findByTestId(container, typeaheadTestId);

        await editor.insertText("+");
        await findByText(popoverContainer, "Tag");

        await assertPopoverVisibility(container, true);

        await editor.press("Escape");

        await assertPopoverVisibility(container, false);
      });

      ["ArrowUp", "ArrowDown"].forEach((arrowKey) => {
        it(`shows the popover again when ${arrowKey} key is pressed`, async () => {
          const { editor, container } = createCqlEditor();
          const popoverContainer = await findByTestId(
            container,
            typeaheadTestId,
          );

          await editor.insertText("+");
          await findByText(popoverContainer, "Tag");

          await assertPopoverVisibility(container, true);

          await editor.press("Escape");

          await assertPopoverVisibility(container, false);

          await editor.press(arrowKey);

          await assertPopoverVisibility(container, true);
        });
      });

      it("dismisses the popover when the editor loses focus", async () => {
        const { editor, container } = createCqlEditor();
        const popoverContainer = await findByTestId(container, typeaheadTestId);

        await editor.insertText("+");
        await findByText(popoverContainer, "Tag");

        await assertPopoverVisibility(container, true);

        await fireEvent.blur(editor.view.dom);

        await assertPopoverVisibility(container, false);
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

      it("applies the given key when a popover option is selected with the Enter key", async () => {
        const { editor, container, waitFor } = createCqlEditor();
        await editor.insertText("example +");

        await selectPopoverOptionWithEnter(editor, container, "Tag");
        const nodeAtCaret = getNodeTypeAtSelection(editor.view);
        expect(nodeAtCaret.name).toBe("chipValue");

        await waitFor("example tag:");
      });

      it("applies the given key when a popover option is selected with a click", async () => {
        const { editor, container, waitFor } = createCqlEditor();
        await editor.insertText("example +");

        await selectPopoverOptionWithClick(container, "Section");
        const nodeAtCaret = getNodeTypeAtSelection(editor.view);
        expect(nodeAtCaret.name).toBe("chipValue");

        await waitFor("example section:");
      });

      it("applies the given key when a popover option is selected at the start of the query", async () => {
        const { editor, container, waitFor } = createCqlEditor();
        await editor.insertText("+");

        await selectPopoverOptionWithEnter(editor, container, "Tag");

        await waitFor("tag:");
      });

      it("displays a popover after another chip", async () => {
        const { editor, container, waitFor } = createCqlEditor("+tag:a");

        editor.insertText("+");

        const nodeAtCaret = getNodeTypeAtSelection(editor.view);
        expect(nodeAtCaret.name).toBe("chipKey");

        const popoverContainer = await findByTestId(container, typeaheadTestId);

        await findByText(popoverContainer, "Tag");
        await findByText(popoverContainer, "Section");
        await selectPopoverOptionWithEnter(editor, container, "Tag");

        await waitFor("tag:a tag:");
      });
    });

    describe("chip values", () => {
      it("inserts a chip before a string", async () => {
        const { editor, waitFor } = createCqlEditor("a");

        await editor.selectText(1).insertText("+");

        await waitFor(": a");
      });

      it("inserts a single whitespace between chips", async () => {
        const { editor, waitFor } = createCqlEditor("+tag:tags-are-magic ");

        await editor.insertText("+");

        await waitFor("tag:tags-are-magic :");
      });

      describe("text suggestions", () => {
        it("displays a popover at the start of a value field", async () => {
          const queryStr = "example +tag:";
          const { editor, container, moveCaretToQueryPos } =
            createCqlEditor("example +tag:");

          await moveCaretToQueryPos(queryStr.length, -1);
          await editor.insertText("t");

          const popoverContainer = await findByTestId(
            container,
            typeaheadTestId,
          );

          await findByText(popoverContainer, "Tags are magic");
        });

        it("applies the given key when a popover option is selected", async () => {
          const queryStr = "example +tag:";
          const { editor, container, waitFor, moveCaretToQueryPos } =
            createCqlEditor("example +tag:");

          await moveCaretToQueryPos(queryStr.length, -1);
          await editor.insertText("t");
          await selectPopoverOptionWithEnter(
            editor,
            container,
            "Tags are magic",
          );

          await waitFor("example tag:tags-are-magic");
        });

        it("applies the given key in quotes when it contains whitespace", async () => {
          const queryStr = "example +tag:";
          const { editor, container, waitFor, moveCaretToQueryPos } =
            createCqlEditor("example +tag:");

          await moveCaretToQueryPos(queryStr.length, -1);
          await editor.insertText("t");
          await selectPopoverOptionWithClick(
            container,
            "Tag with a space in it",
          );

          await waitFor('example tag:"Tag with space"');
        });

        it("applies the given key in quotes when it follows another tag with whitespace", async () => {
          const queryStr = `tag:"1 2"`;
          const { editor, container, waitFor } = createCqlEditor(queryStr);

          await editor.insertText(" +");
          await selectPopoverOptionWithClick(container, "Tag");

          await waitFor(`${queryStr} tag:`);
        });

        it("applies the given key over another key correctly when it contains whitespace", async () => {
          const queryStr = `example +tag:"Tag with spac"`;
          const { container, waitFor, moveCaretToQueryPos } =
            createCqlEditor(queryStr);
          await moveCaretToQueryPos(queryStr.length - 2);

          await selectPopoverOptionWithClick(
            container,
            "Tag with a space in it",
          );

          await waitFor('example tag:"Tag with space"');
        });

        it("does not show a typeahead menu between two adjacent query fields", async () => {
          const queryStr = `+tag:a +tag:b`;
          const { container, moveCaretToQueryPos } = createCqlEditor(queryStr);
          await moveCaretToQueryPos(queryStr.indexOf(" "));

          await assertPopoverVisibility(container, false);
        });

        it("applies a suggestion correctly after adding a field without a prefix", async () => {
          const { editor, container, waitFor } = createCqlEditor();

          await editor.insertText("tag:");

          const nodeAtCaret = getNodeTypeAtSelection(editor.view);
          expect(nodeAtCaret.name).toBe("chipValue");

          const popoverContainer = await findByTestId(
            container,
            typeaheadTestId,
          );

          await findByText(popoverContainer, "Tags are magic");

          await selectPopoverOptionWithEnter(
            editor,
            container,
            "Tags are magic",
          );

          await waitFor("tag:tags-are-magic");
        });
      });
    });

    describe("date suggestions", () => {
      it("should do nothing when nothing is selected", async () => {
        const queryStr = "example +from-date:";
        const { editor, container, moveCaretToQueryPos } =
          createCqlEditor(queryStr);

        await moveCaretToQueryPos(queryStr.length, -1);
        await findByText(container, "1 day ago");

        await editor.press("Enter");
      });

      it("applies relative dates", async () => {
        const queryStr = "example +from-date:";
        const { editor, waitFor, container, moveCaretToQueryPos } =
          createCqlEditor(queryStr);

        await moveCaretToQueryPos(queryStr.length, -1);
        const popoverContainer = await findByTestId(container, typeaheadTestId);

        await findByText(popoverContainer, "1 day ago");
        await editor.press("ArrowDown");
        await tick(); // To allow the component state subscription to update
        await editor.press("Enter");

        await waitFor("example from-date:-1d");
      });

      it("applies absolute dates on click", async () => {
        const queryStr = "example +from-date:";
        const { editor, waitFor, container, moveCaretToQueryPos } =
          createCqlEditor(queryStr);

        await moveCaretToQueryPos(queryStr.length, -1);
        const popoverContainer = await findByTestId(container, typeaheadTestId);

        await findByText(popoverContainer, "1 day ago");
        await editor.press("ArrowDown");
        await tick();
        await editor.press("ArrowRight");

        const input = popoverContainer.getElementsByTagName("input")[0];
        await fireEvent.change(input, { target: { value: "2015-12-10" } });

        const button = await findByText(popoverContainer, "Apply");
        await fireEvent.click(button);

        await waitFor("example from-date:2015-12-10");
      });
    });
  });

  describe("chip behaviour", () => {
    it("should change the polarity of a chip when the polarity indicator is clicked", async () => {
      const queryStr = "+tag:a";
      const { waitFor, container, user } = createCqlEditor(queryStr);
      const polarityHandle = await getByTestId(
        container,
        TEST_ID_POLARITY_HANDLE,
      );

      await user.click(polarityHandle);

      await waitFor("-tag:a");
    });

    it("should not de-chip text if the queryStr between chips is removed", async () => {
      const queryStr = "+tag:a b +tag:c";
      const { editor, moveCaretToQueryPos, waitFor } =
        createCqlEditor(queryStr);

      await moveCaretToQueryPos(queryStr.indexOf("b"), 1);
      await editor.backspace();

      await waitFor("tag:a tag:c");
    });

    it("should move the selection into value position when the user types a shortcut", async () => {
      const { editor, waitFor } = createCqlEditor("", {
        lang: {
          shortcuts: {
            "#": "tag",
          },
        },
      });

      await editor.insertText("#");

      await waitFor("tag:");
      expect(editor.selection.$from.node().type).toBe(chipValue);
    });

    it("should move the selection into value position when the user types a shortcut after text", async () => {
      const queryStr = "a ";
      const { editor, waitFor } = createCqlEditor(queryStr, {
        lang: {
          shortcuts: {
            "#": "tag",
          },
        },
      });

      await editor.insertText("#");

      await waitFor("a tag:");
      const chipValuePos = findNodeAt(0, editor.doc, chipValue) + 1;

      expect(editor.selection.from).toBe(chipValuePos);
    });

    describe("read-only behaviour", () => {
      it("should not make chip keys read only when they are empty", async () => {
        const queryStr = "a +: c";
        const { getPosFromQueryPos, editor } = createCqlEditor(queryStr);

        // +1 to place the selection within the chip key
        const chipKeyPos = getPosFromQueryPos(queryStr.indexOf("+")) + 1;
        editor.selectText(chipKeyPos);

        expect(editor.selection.from).toBe(chipKeyPos);
      });

      it("should make chip keys read only when the selection does not fall within their content and they are not empty", async () => {
        const queryStr = "a +tag:b c";
        const { container } = createCqlEditor(queryStr);

        const chipKey = await findByText(container, "tag");

        expect(chipKey.isContentEditable).toBe(false);
      });

      it("should not permit selections within read-only chip keys", async () => {
        const queryStr = "a +tag:b c";
        const { editor, getPosFromQueryPos } = createCqlEditor(queryStr);
        const invalidPos = getPosFromQueryPos(queryStr.indexOf("g"));
        const initialPos = editor.selection.from;
        editor.selectText(invalidPos);

        expect(editor.selection.from).toBe(initialPos);
      });

      // These tests are difficult to write because the click events here do not
      // seem to trigger selection behaviour. Leaving as todos for specification
      // purposes. Likely to require in-browser testing.
      it.todo(
        "should not permit selections within chip values when the sibling key does not have a value",
        async () => {
          const queryStr = "a +: b";
          const { editor, container } = createCqlEditor(queryStr);
          const initialPos = editor.selection.from;
          const chipValue = await findByTestId(container, TEST_ID_CHIP_VALUE);

          await fireEvent.click(chipValue);

          expect(editor.selection.from).toBe(initialPos);
        },
      );

      it.todo(
        "should permit selections within chip values when the sibling key does have a value",
        async () => {
          const queryStr = "a +a: b";
          const { editor, getPosFromQueryPos, container } =
            createCqlEditor(queryStr);
          // +1 to push the selection into the chipValue content
          const validPos = getPosFromQueryPos(queryStr.indexOf(":")) + 1;
          const chipValue = await findByTestId(container, TEST_ID_CHIP_VALUE);

          await fireEvent.click(chipValue);

          expect(editor.selection.from).toBe(validPos);
        },
      );
    });

    const findNodesByType = (doc: Node, type: NodeType) => {
      const nodes: Node[] = [];
      doc.descendants((node) => {
        if (node.type === type) {
          nodes.push(node);
        }
      });
      return nodes;
    };

    it("not mark chips as selected when they are not covered by a selection", async () => {
      const queryStr = "+tag:a b +tag:c";
      const { editor, getPosFromQueryPos } = createCqlEditor(queryStr);

      editor.selectText({
        from: 0,
        to: getPosFromQueryPos(queryStr.indexOf("b")),
      });

      const [firstChip, secondChip] = findNodesByType(editor.doc, chip);
      expect(firstChip.attrs[IS_SELECTED]).toBe(true);
      expect(secondChip.attrs[IS_SELECTED]).toBe(false);
    });

    it("should mark chips as selected when they are entirely covered by a selection", async () => {
      const queryStr = "+tag:a b +tag:c";
      const { editor } = createCqlEditor(queryStr);

      editor.selectText("all");

      const [firstChip, secondChip] = findNodesByType(editor.doc, chip);
      expect(firstChip.attrs[IS_SELECTED]).toBe(true);
      expect(secondChip.attrs[IS_SELECTED]).toBe(true);
    });

    it.todo(
      "should not remove chip keys when hitting backspace from a chip value",
      async () => {
        const queryStr = " +tag:b ";
        const { editor, moveCaretToQueryPos, waitFor } =
          createCqlEditor(queryStr);

        await moveCaretToQueryPos(queryStr.indexOf("b"));

        // Doing this in a browser wraps the key node in a
        // NodeSelection and then deletes it unless we explicitly
        // prevent the selection, but that does not happen here.
        await editor.backspace().backspace();

        await waitFor("+tag:");
      },
    );
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

      await waitFor("a tag: b");
    });

    it("permits additional query fields before query fields", async () => {
      const { editor, waitFor } = createCqlEditor("+2");

      await editor.shortcut("Ctrl-a").insertText("+1");

      await waitFor("1: 2:");
    });

    it("should clear the selection when the user blurs the input", async () => {
      const { editor } = createCqlEditor("+tag:example");

      await editor.selectText("all");
      document.body.focus();

      expect(editor.selection.to).toBe(1);
    });

    // The selection is correct immediately after handleDoubleClick fires, but is not correct in the assertion 🤔
    it.todo(
      "should select the whole document when the user double clicks on the input container",
      async () => {
        const { editor, user } = createCqlEditor("+tag:example");

        await user.dblClick(editor.view.dom);

        expect(
          editor.state.selection.eq(new AllSelection(editor.view.state.doc)),
        ).toBe(true);
      },
    );
  });

  describe("deletion", () => {
    ["Backspace", "Delete"].forEach((key) => {
      it(`removes an empty chip via ${key} within the chip key`, async () => {
        const queryStr = "before +: after";
        const { editor, waitFor, getPosFromQueryPos } =
          createCqlEditor(queryStr);

        editor.selectText(getPosFromQueryPos(queryStr.indexOf("+")));

        await editor.press(key);

        await waitFor("before after");
      });

      it(`removes an empty chip via ${key} within the chip value`, async () => {
        const queryStr = "before +tag: after";
        const { editor, waitFor, getPosFromQueryPos } =
          createCqlEditor(queryStr);

        editor.selectText(getPosFromQueryPos(queryStr.indexOf(":")));

        await editor.press(key);

        await waitFor("before after");
      });
    });

    it("puts the chip in a pending state before deletion - keyboard", async () => {
      const { editor, waitFor } = createCqlEditor("+tag:a");

      await editor.press("Backspace");

      await waitFor("tag:a");
    });

    it("puts the chip in a pending state before deletion - mouse", async () => {
      const { editor, waitFor } = createCqlEditor("+tag:a");

      const deleteBtn = await findByText(editor.view.dom, "×");
      await fireEvent.click(deleteBtn);

      await waitFor("tag:a");
    });

    it("removes the chip via backspace", async () => {
      const query = "+tag:z text";
      const { editor, waitFor, moveCaretToQueryPos } = createCqlEditor(query);

      await moveCaretToQueryPos(query.indexOf("z") + 1);
      await editor.press("Backspace").press("Backspace");

      await waitFor("text");
    });

    it("does not remove the chip via backspace when the selection is not collapsed", async () => {
      const query = "+tag:z text";
      const { editor, waitFor, getPosFromQueryPos } = createCqlEditor(query);

      const from = getPosFromQueryPos(query.indexOf("text"));
      const to = getPosFromQueryPos(query.length - 1);
      await editor.selectText({ from, to }).press("Backspace");

      // Nothing should happen
      await waitFor("tag:z text");
    });

    it("removes the chip via delete", async () => {
      const { editor, waitFor } = createCqlEditor("+tag:a");

      await editor.selectText("start").press("Delete").press("Delete");

      await waitFor("");
    });

    it("removes the chip via click", async () => {
      const { editor, waitFor } = createCqlEditor("+tag:a");

      const deleteBtn = await findByText(editor.view.dom, "×");
      await fireEvent.click(deleteBtn);

      await waitFor("");
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

    describe("chip values", () => {
      it("should handle text pasted into chip value position, preserving whitespace and reserved characters where necessary", () => {
        const { editor } = createCqlEditor("+tag:");
        const payload = "https://a.url.com";
        const selectionPos = findNodeAt(0, editor.doc, chipValue);
        editor.selectText(selectionPos);

        pasteContent(editor.view, [{ payload, type: "text/plain" }]);

        expect(docToCqlStrWithSelection(editor.state)).toEqual(
          `+tag:"${payload}^$" `,
        );
      });
    });

    describe("selection", () => {
      it(`should preserve the selection state on paste into a blank document for data type "text/plain"`, () => {
        const { editor } = createCqlEditor("");
        const payload = "+tag:example";

        pasteContent(editor.view, [{ payload, type: "text/plain" }]);

        expect(docToCqlStrWithSelection(editor.state)).toEqual(
          "+tag:example ^$",
        );
      });

      it(`should preserve the selection state on paste for data type "text/plain" before text`, () => {
        const { editor } = createCqlEditor("text");
        editor.view.dispatch(
          editor.state.tr.setSelection(
            TextSelection.near(editor.state.doc.resolve(0)),
          ),
        );
        const payload = "+tag:example";

        pasteContent(editor.view, [{ payload, type: "text/plain" }]);

        expect(docToCqlStrWithSelection(editor.state)).toEqual(
          "+tag:example ^$text",
        );
      });

      it(`should preserve the selection state on paste for data type "text/plain" in middle of text`, () => {
        const { editor } = createCqlEditor("a  b");
        editor.view.dispatch(
          editor.state.tr.setSelection(
            TextSelection.near(editor.state.doc.resolve(3)),
          ),
        );
        const payload = "start +tag:example end";

        pasteContent(editor.view, [{ payload, type: "text/plain" }]);

        expect(docToCqlStrWithSelection(editor.state)).toEqual(
          "a start +tag:example end^$ b",
        );
      });

      it(`should preserve the selection state on paste for data type "text/plain" after text`, () => {
        const { editor } = createCqlEditor("text ");
        const payload = "+tag:example";

        pasteContent(editor.view, [{ payload, type: "text/plain" }]);

        expect(docToCqlStrWithSelection(editor.state)).toEqual(
          "text +tag:example ^$",
        );
      });

      it(`should preserve the selection state on paste for data type "text/html"`, () => {
        const { editor } = createCqlEditor("text ");
        const payload = `<meta charset='utf-8'><query-str data-pm-slice="0 0 []"></query-str><chip data-polarity="+"><chip-key>tag</chip-key><chip-value>type/article</chip-value></chip><query-str></query-str>`;

        pasteContent(editor.view, [{ payload, type: "text/html" }]);

        expect(docToCqlStrWithSelection(editor.state)).toEqual(
          "text +tag:type/article ^$",
        );
      });
    });

    it(`should not use HTML that does not contain ProseMirror markup as HTML`, () => {
      const { editor } = createCqlEditor("");
      const htmlPayload = "html";
      const textPayload = "this then that";

      pasteContent(editor.view, [
        { payload: htmlPayload, type: "text/html" },
        { payload: textPayload, type: "text/plain" },
      ]);

      expect(docToCqlStr(editor.state.doc)).toEqual(textPayload);
    });
  });
});
