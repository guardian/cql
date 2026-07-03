import { describe, expect, it } from "bun:test";
import { h, render } from "preact";
import { TextSuggestionContent } from "./TextSuggestionContent";
import { TextSuggestionOption } from "../../../lang/types";
import type { TextSuggestion } from "../../../lang/types";
import type { ActionHandler, ActionSubscriber } from "../TypeaheadPopover";
import { tick } from "../../../utils/test";

describe("TextSuggestionContent", () => {
  const createSuggestion = (count: number): TextSuggestion => ({
    from: 0,
    to: 0,
    type: "TEXT",
    position: "chipValue",
    suggestions: Array.from(
      { length: count },
      (_, i) => new TextSuggestionOption(`Option ${i}`, `option-${i}`),
    ),
  });

  const setup = async (count = 5) => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    let actionHandler: ActionHandler | undefined;
    const subscribeToAction: ActionSubscriber = (handler) => {
      actionHandler = handler;
      return () => {
        actionHandler = undefined;
      };
    };

    render(
      h(TextSuggestionContent, {
        suggestion: createSuggestion(count),
        isPending: false,
        onSelect: () => {},
        subscribeToAction,
      }),
      container,
    );

    // Let mount-time effects (subscribing to actions, resetting the current
    // option for the initial suggestion) settle before interacting, just as
    // they would have settled long before a human could move a mouse.
    await tick();

    const getOptions = () =>
      Array.from(container.querySelectorAll<HTMLElement>(".Cql__Option"));

    const getSelectedIndex = () =>
      getOptions().findIndex((el) =>
        el.classList.contains("Cql__Option--is-selected"),
      );

    const hover = async (index: number) => {
      getOptions()[index].dispatchEvent(
        new MouseEvent("mouseenter", { bubbles: true }),
      );
      await tick();
    };

    const sendAction = async (action: "up" | "down") => {
      actionHandler?.(action);
      await tick();
    };

    const moveMouse = async () => {
      document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
      await tick();
    };

    return { getOptions, getSelectedIndex, hover, sendAction, moveMouse };
  };

  it("selects the hovered option when the mouse moves over it", async () => {
    const { getSelectedIndex, hover } = await setup();

    await hover(2);

    expect(getSelectedIndex()).toBe(2);
  });

  it("does not let a hover-only mouseenter (no mousemove) override keyboard navigation", async () => {
    const { getSelectedIndex, hover, sendAction } = await setup();

    // The user is hovering over option 1 when they start pressing arrow keys.
    await hover(1);
    expect(getSelectedIndex()).toBe(1);

    await sendAction("down");
    expect(getSelectedIndex()).toBe(2);

    // Scrolling the list to keep the new selection in view moves the options
    // underneath the still-stationary mouse cursor. The browser responds by
    // firing a "mouseenter" on whichever option now sits under the pointer -
    // simulated here by re-firing mouseenter on option 1 without any
    // "mousemove" in between, exactly as happens in the browser.
    await hover(1);

    expect(getSelectedIndex()).toBe(2);
  });

  it("resumes tracking hover once the mouse genuinely moves again", async () => {
    const { getSelectedIndex, hover, sendAction, moveMouse } = await setup();

    await hover(1);
    await sendAction("down");
    expect(getSelectedIndex()).toBe(2);

    await moveMouse();
    await hover(3);

    expect(getSelectedIndex()).toBe(3);
  });
});
