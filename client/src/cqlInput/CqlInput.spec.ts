import { describe, expect, test } from "bun:test";
import { TestTypeaheadHelpers } from "../lang/fixtures/TestTypeaheadHelpers";
import { createCqlInput, Typeahead } from "../lib";
import { getByTextShadowed } from "../utils/test";

describe("CqlInput", () => {
  const typeheadHelpers = new TestTypeaheadHelpers();
  const typeahead = new Typeahead(typeheadHelpers.typeaheadFields);
  const CqlInput = createCqlInput(typeahead);
  customElements.define("cql-input", CqlInput);

  const createCqlInputContainer = (value?: string) => {
    const container = document.body;
    container.innerHTML = "";
    const cqlInput = new CqlInput();
    container.appendChild(cqlInput);
    if (value) cqlInput.setAttribute("value", value);
    return { container, cqlInput };
  };

  test("should render the given value when first instantiated", async () => {
    const { container } = createCqlInputContainer("one");
    const result = await getByTextShadowed(container, "one");
    expect(result).toBeTruthy();
  });

  test("should update the rendered value, and call the callback, when the attribute changes", async () => {
    const { container, cqlInput } = createCqlInputContainer("one");
    let callbackValue = "";
    cqlInput.addEventListener(
      "queryChange",
      (e) => (callbackValue = e.detail.queryStr),
    );
    cqlInput.setAttribute("value", "two");
    const result = await getByTextShadowed(container, "two");
    expect(result).toBeTruthy();
    expect(callbackValue).toBe("two");
  });
});
