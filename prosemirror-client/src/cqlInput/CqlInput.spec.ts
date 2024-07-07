import { test, mock } from "bun:test";
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
  return container;
};

const findContentEditable = (container: HTMLElement) =>
  findByShadowTestId(container, contentEditableTestId);

const typeIntoInput = async (container: HTMLElement, text: string) => {
  const contentEditable = await findContentEditable(container);
  contentEditable.focus();
  userEvent.keyboard(text);
};

const moveCursorToEnd = async (container: HTMLElement) => {
  const contentEditableEl = await findContentEditable(container);
  const range = document.createRange();
  const selection = window.getSelection();
  range.setStart(contentEditableEl, contentEditableEl.childNodes.length);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
};

test("renders a custom element", async () => {
  const container = mountComponent("");
  await findByTestId(container, "cql-input");
});

test("accepts and displays a basic query", async () => {
  const container = mountComponent("");
  await typeIntoInput(container, "example");
  await findByShadowText(container, "example");
});

test("displays an initial value", async () => {
  const container = mountComponent("example");
  await findByShadowText(container, "example");
});

test("displays a popover when a tag prompt is entered", async () => {
  const container = mountComponent("example ");
  await moveCursorToEnd(container);
  await typeIntoInput(container, "+");
  const popoverContainer = await findByShadowTestId(container, popoverTestId);
  await findByShadowText(popoverContainer, "Tag");
  await findByShadowText(popoverContainer, "Section");
});
