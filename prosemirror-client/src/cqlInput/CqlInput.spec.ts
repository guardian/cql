import { describe, it, mock, expect, beforeEach } from "bun:test";
import {
  contentEditableTestId,
  createCqlInput,
  typeaheadTestId,
} from "./CqlInput";
import { findByTestId } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import {
  findByShadowTestId,
  findByShadowText,
} from "shadow-dom-testing-library";
import { CqlClientService } from "../services/CqlService";
import { TestTypeaheadHelpers } from "../lang/typeaheadHelpersTest";

mock.module("../CqlService", () => ({}));

const typeheadHelpers = new TestTypeaheadHelpers();
const testCqlService = new CqlClientService(typeheadHelpers.fieldResolvers);
const cqlInput = createCqlInput(testCqlService);
window.customElements.define("cql-input", cqlInput);

const mountComponent = (query: string) => {
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

  moveCursorToStart(container);

  return { container, valueContainer };
};

const findContentEditable = (container: HTMLElement) =>
  findByShadowTestId(container, contentEditableTestId);

const typeIntoInput = async (container: HTMLElement, text: string) => {
  const contentEditable = await findContentEditable(container);
  contentEditable.focus();

  await userEvent.keyboard(text, { delay: 1 });
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
  container: HTMLElement,
  optionLabel: string
) => {
  const popoverContainer = await findByShadowTestId(container, typeaheadTestId);
  await findByShadowText(popoverContainer, optionLabel);
  await typeIntoInput(container, "{Enter}");
};

describe("CqlInput", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("accepts and displays a basic query", async () => {
    const { container, valueContainer } = mountComponent("");

    await typeIntoInput(container, "example");
    expect(valueContainer.value).toBe("example");
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
    const { container } = mountComponent("");

    await typeIntoInput(container, "example +");

    const popoverContainer = await findByShadowTestId(
      container,
      typeaheadTestId
    );
    await findByShadowText(popoverContainer, "Tag");
    await findByShadowText(popoverContainer, "Section");
  });

  it("accepts the given value when a popover appears", async () => {
    const { container, valueContainer } = mountComponent("");
    await moveCursorToEnd(container);
    await typeIntoInput(container, " example +");
    await selectPopoverOption(container, "Tag");
    await findByShadowText(container, "tag");

    expect(valueContainer.value).toBe("example +tag");
  });

  it("ctrl-a moves the caret to the beginning of the input", async () => {
    const { container } = mountComponent("a");
    await typeIntoInput(container, "{Control>}a{/Control}");
    await typeIntoInput(container, "b");

    await findByShadowText(container, "ba");
  });

  it("ctrl-e moves the caret to the end of the input", async () => {
    const { container } = mountComponent("a");
    await moveCursorToStart(container);
    await typeIntoInput(container, "{Control>}e{/Control}");
    await typeIntoInput(container, "b");

    await findByShadowText(container, "ab");
  });

  it("permits content before query fields", async () => {
    const { container, valueContainer } = mountComponent("+tag");

    await typeIntoInput(container, "a");

    expect(valueContainer.value).toBe("a +tag");
  });
});
