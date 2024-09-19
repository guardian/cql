import { describe, it, mock, beforeEach } from "bun:test";
import {
  contentEditableTestId,
  createCqlInput,
  typeaheadTestId,
} from "./CqlInput";
import { findByTestId } from "@testing-library/dom";
import userEvent, { UserEvent } from "@testing-library/user-event";
import {
  findByShadowTestId,
  findByShadowText,
} from "shadow-dom-testing-library";
import { CqlClientService } from "../services/CqlService";
import { TestTypeaheadHelpers } from "../lang/typeaheadHelpersTest";

mock.module("../CqlService", () => ({}));

const typeheadHelpers = new TestTypeaheadHelpers();
const testCqlService = new CqlClientService(typeheadHelpers.fieldResolvers);

// The decorations that implement syntax highlighting cause problems with
// mutationobservers on .keyboard.
const cqlInput = createCqlInput(testCqlService, { syntaxHighlighting: false });
window.customElements.define("cql-input", cqlInput);

const mountComponent = (query: string) => {
  const user = userEvent.setup();
  const container = document.body;
  const input = document.createElement("cql-input");
  input.setAttribute("data-testid", "cql-input");
  input.setAttribute("initial-value", query);
  container.appendChild(input);

  const valueContainer = { value: undefined as string | undefined };

  input.addEventListener(
    "queryChange",
    (e) => (valueContainer.value = e.detail.cqlQuery)
  );

  const subscribers: Array<(s: string) => void> = [];
  const valuesReceived: string[] = [];
  const dispatch = (value: string) => {
    valuesReceived.push(value);
    subscribers.forEach((s) => s(value));
  };

  input.addEventListener("queryChange", (e) => dispatch(e.detail.cqlQuery));

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

  return { user, container, waitFor };
};

const findContentEditable = (container: HTMLElement) =>
  findByShadowTestId(container, contentEditableTestId);

const typeIntoInput = async (
  user: UserEvent,
  container: HTMLElement,
  text: string
) => {
  const contentEditable = await findContentEditable(container);
  contentEditable.focus();

  await user.keyboard(text);
};

const moveCursor = (contentEditableEl: HTMLElement, index: number) => {
  const range = document.createRange();
  const selection = window.getSelection();
  range.setStart(contentEditableEl, index);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
};

const moveCursorToStart = async (container: HTMLElement) => {
  const contentEditableEl = await findContentEditable(container);
  await moveCursor(contentEditableEl, 0);
};

const moveCursorToEnd = async (container: HTMLElement) => {
  const contentEditableEl = await findContentEditable(container);
  await moveCursor(contentEditableEl, contentEditableEl.childNodes.length);
};

const selectPopoverOption = async (
  user: UserEvent,
  container: HTMLElement,
  optionLabel: string
) => {
  const popoverContainer = await findByShadowTestId(container, typeaheadTestId);
  await findByShadowText(popoverContainer, optionLabel);
  await typeIntoInput(user, container, "{Enter}");
};

describe("CqlInput", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("accepts and displays a basic query", async () => {
    const { user, container, waitFor } = mountComponent("");

    await typeIntoInput(user, container, "example");

    await waitFor("example");
  });

  it("renders a custom element", async () => {
    const { container } = mountComponent("");
    await findByTestId(container, "cql-input");
  });

  it("displays an initial value", async () => {
    const { container } = mountComponent("example");
    await findByShadowText(container, "example");
  });

  it("displays a popover when a tag prompt is entered", async () => {
    const { user, container } = mountComponent("");

    await typeIntoInput(user, container, "example +");

    const popoverContainer = await findByShadowTestId(
      container,
      typeaheadTestId
    );

    await findByShadowText(popoverContainer, "Tag");
    await findByShadowText(popoverContainer, "Section");
  });

  it("accepts the given value when a popover appears", async () => {
    const { user, container, waitFor } = mountComponent("");
    await moveCursorToEnd(container);
    await typeIntoInput(user, container, " example +");

    await waitFor("example +");

    await selectPopoverOption(user, container, "Tag");

    await waitFor("example +tag");
  });

  it("ctrl-a moves the caret to the beginning of the input", async () => {
    const { user, container, waitFor } = mountComponent("a");

    await moveCursorToEnd(container);
    await typeIntoInput(user, container, "{Control>}a{/Control}b");
    await typeIntoInput(user, container, "b");

    await waitFor("ba");
  });

  it("ctrl-e moves the caret to the end of the input", async () => {
    const { user, container } = mountComponent("a");
    await moveCursorToStart(container);
    await typeIntoInput(user, container, "{Control>}e{/Control}");
    await typeIntoInput(user, container, "b");

    await findByShadowText(container, "ab");
  });

  it("permits content before query fields", async () => {
    const { user, container, waitFor } = mountComponent("+tag");

    await typeIntoInput(user, container, "a");

    await waitFor("a +tag");
  });
});
