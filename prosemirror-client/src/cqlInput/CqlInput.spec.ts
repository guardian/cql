import { test, mock, expect } from "bun:test";
import {
  contentEditableTestId,
  createCqlInput,
  popoverTestId,
} from "./CqlInput";
import { TestCqlService } from "./fixtures/TestCqlService";
import { findByTestId } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import {
  findByShadowTestId,
  findByShadowText,
} from "shadow-dom-testing-library";

mock.module("../CqlService", () => ({}));

const testCqlService = new TestCqlService("url");
const cqlInput = createCqlInput(testCqlService);
window.customElements.define("cql-input", cqlInput);

const mountComponent = (query: string) => {
  document.body.innerHTML = "";
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

  return { container, valueContainer };
};

const findContentEditable = (container: HTMLElement) =>
  findByShadowTestId(container, contentEditableTestId);

const typeIntoInput = async (container: HTMLElement, text: string) => {
  const contentEditable = await findContentEditable(container);
  contentEditable.focus();
  await userEvent.keyboard(text);
};

const moveCursor = async (contentEditableEl: HTMLElement, index: number) => {
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
  const popoverContainer = await findByShadowTestId(container, popoverTestId);
  await findByShadowText(popoverContainer, optionLabel);
  await typeIntoInput(container, "{Enter}");
};

test("renders a custom element", async () => {
  const { container } = mountComponent("");
  await findByTestId(container, "cql-input");
});

test("accepts and displays a basic query", async () => {
  const { container } = mountComponent("");
  await typeIntoInput(container, "example");
  await findByShadowText(container, "example");
});

test("displays an initial value", async () => {
  const { container } = mountComponent("example");
  await findByShadowText(container, "example");
});

test("displays a popover when a tag prompt is entered", async () => {
  const { container } = mountComponent("example ");
  await moveCursorToEnd(container);
  await typeIntoInput(container, "+");

  const popoverContainer = await findByShadowTestId(container, popoverTestId);
  await findByShadowText(popoverContainer, "Tag");
  await findByShadowText(popoverContainer, "Section");
});

test("accepts the given value when a popover appears", async () => {
  const { container, valueContainer } = mountComponent("example ");
  await moveCursorToEnd(container);
  await typeIntoInput(container, "+");
  await selectPopoverOption(container, "Tag");
  await findByShadowText(container, "tag");

  expect(valueContainer.value).toBe("example +tag:  ");
});

test("ctrl-a moves the caret to the beginning of the input", async () => {
  const { container } = mountComponent("example ");
  await typeIntoInput(container, "{Control>}a{/Control}<");
});

test("ctrl-e moves the caret to the end of the input", async () => {
  const { container } = mountComponent("example ");
  await moveCursorToStart(container);
  await typeIntoInput(container, "{Control>}e{/Control}>");
});
