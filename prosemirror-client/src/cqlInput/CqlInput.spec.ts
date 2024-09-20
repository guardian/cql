import { describe, it, beforeEach } from "bun:test";
import { errorMsgTestId, errorTestId, typeaheadTestId } from "./CqlInput";
import { findByTestId, findByText } from "@testing-library/dom";
import { CqlClientService } from "../services/CqlService";
import { TestTypeaheadHelpers } from "../lang/typeaheadHelpersTest";
import { createEditor, ProsemirrorTestChain } from "jest-prosemirror";
import { doc } from "./schema";
import { createCqlPlugin } from "./plugin";
import { redo, undo } from "prosemirror-history";
import { bottomOfLine, topOfLine } from "./commands";
import { keymap } from "prosemirror-keymap";

const typeheadHelpers = new TestTypeaheadHelpers();
const testCqlService = new CqlClientService(typeheadHelpers.fieldResolvers);

const createCqlEditor = () => {
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

  const editor = createEditor(doc.create(), {
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

  return { editor, waitFor, container };
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

  it("accepts and displays a basic query", async () => {
    const { editor, waitFor } = createCqlEditor();

    await editor.insertText("example");

    await waitFor("example");
  });

  it("displays a popover when a tag prompt is entered", async () => {
    const { editor, container } = createCqlEditor();

    await editor.insertText("example +");

    const popoverContainer = await findByTestId(container, typeaheadTestId);

    await findByText(popoverContainer, "Tag");
    await findByText(popoverContainer, "Section");
  });

  it("accepts the given value when a popover appears", async () => {
    const { editor, container, waitFor } = createCqlEditor();
    await editor.insertText("example +");

    await waitFor("example +");

    await selectPopoverOption(editor, container, "Tag");

    await waitFor("example +tag");
  });

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
    const { editor, waitFor } = createCqlEditor();

    await editor.insertText("+tag").shortcut("Ctrl-a").insertText("a ");

    await waitFor("a +tag");
  });
});
