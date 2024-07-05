import { test, mock } from "bun:test";
import { createCqlInput } from "./CqlInput";
import { TestCqlService } from "../services/TestCqlService";
import example from "./fixtures/responses/example.json";
import { createEvent, findByTestId, fireEvent } from "@testing-library/dom";
import { findByShadowText, prettyShadowDOM } from "shadow-dom-testing-library";

mock.module("../CqlService", () => ({}));

const testCqlService = new TestCqlService("http://localhost", {
  example: example as any, // Fix types
});
const cqlInput = createCqlInput(testCqlService);
window.customElements.define("cql-input", cqlInput);

const mountComponent = () => {
  document.body.innerHTML = '';
  const container = document.body;
  const input = document.createElement("cql-input");
  input.setAttribute("data-testid", "cql-input");
  container.appendChild(input);
  return container;
};

test("renders a custom element", async () => {
  const container = mountComponent();
  await findByTestId(container, "cql-input");
});

test("displays a basic query", async () => {
  const container = mountComponent();
  await findByShadowText(container, "example");
});