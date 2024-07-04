import { test, mock, expect } from "bun:test";
import { createCqlInput } from "./CqlInput";
import { TestCqlService } from "../services/TestCqlService";
import example from "./fixtures/responses/example.json";
import { findByTestId } from "@testing-library/dom";

mock.module("../CqlService", () => ({}));

const testCqlService = new TestCqlService("http://localhost", {
  example, // Fix types
});
const cqlInput = createCqlInput(testCqlService);
customElements.define("cql-input", cqlInput);

const mountComponent = () => {
  const container = document.createElement("div");
  container.innerHTML = `<cql-input data-testid="cql-input"></cql-input>`;
  return container;
};

test("renders a custom element", async () => {
  const container = mountComponent();
  await findByTestId(container, "cql-input");
});
