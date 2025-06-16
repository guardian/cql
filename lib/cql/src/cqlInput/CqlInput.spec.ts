import { describe, expect, test } from "bun:test";
import { userEvent } from "@testing-library/user-event";
import { TestTypeaheadHelpers } from "../lang/fixtures/TestTypeaheadHelpers";
import { createCqlInput, Typeahead } from "../lib";
import { getByTextShadowed, tick } from "../utils/test";

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
    const user = userEvent.setup();
    return { container, cqlInput, user };
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

  test("should not display the popover when the input is updated programmatically, and not focused", async () => {
    const { container, cqlInput } = createCqlInputContainer("");

    cqlInput.setAttribute("value", "+");
    // Wait for the popover to render
    await tick();

    const result = await getByTextShadowed(container, "Tag");
    expect(!!result).toBeFalse();
  });

  test.todo("should not bubble events into the document", async () => {
    const { container, cqlInput, user } = createCqlInputContainer("");

    let eventReceived = false;
    container.addEventListener("keydown", () => {
      eventReceived = true;
    });

    cqlInput.focus();
    await user.keyboard("example");

    // At the moment, this test does not focus on the correct input,
    // possibly because it exists in the shadow DOM
    expect(
      eventReceived,
      "This event should not be propagated to the input's container",
    ).toBe(false);
  });
});
