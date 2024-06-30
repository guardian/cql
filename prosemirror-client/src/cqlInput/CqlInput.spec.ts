import { test, expect, mock } from "bun:test";
import { createCqlInput } from "./CqlInput";
import { CqlService } from "../CqlService";

mock.module("../CqlService", () => ({}));

const testCqlService = new CqlService("http://localhost");
const cqlInput = createCqlInput(testCqlService);
customElements.define("cql-input", cqlInput);

const mountComponent = () => {
  document.body.innerHTML = `<cql-input></cql-input>`;
};

test("renders a custom element", () => {
  mountComponent();
});
