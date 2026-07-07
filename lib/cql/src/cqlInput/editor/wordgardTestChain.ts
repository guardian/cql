import { Wordgard } from "wordgard/editor";
import { GardSelection } from "wordgard/state";
import { selectAll } from "wordgard/command";
// `insertText` and `Command` are the same public entry points wordgard's own
// `beforeinput` handler uses to apply typed text (see editor.js `baseHandlers`).
import { Command, insertText } from "wordgard/command";

/**
 * A small fluent test harness over a live {@link Wordgard} instance, replacing
 * the `ProsemirrorTestChain` from `jest-prosemirror`. It drives the editor the
 * way a user would: typed characters are dispatched as real `keydown` events so
 * the plugin's key bindings (including the `char` bindings for `+`, `-` and `:`)
 * run, and — when the keydown is not consumed — the character is inserted via
 * the same `insertText` command wordgard uses for `beforeinput`.
 *
 * Every method returns the chain for fluent chaining, and the chain is
 * awaitable (its `then` flushes the microtask queue) so both
 * `editor.insertText("x")` and `await editor.insertText("x")` work.
 */

const MODIFIER_TOKENS: Record<string, keyof Modifiers> = {
  cmd: "metaKey",
  command: "metaKey",
  meta: "metaKey",
  ctrl: "ctrlKey",
  control: "ctrlKey",
  alt: "altKey",
  option: "altKey",
  shift: "shiftKey",
};

type Modifiers = {
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

const isMac = () =>
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent || "");

/**
 * Parse a combo such as `"Cmd-a"`, `"Ctrl--"`, `"Cmd-+"`, `"Mod-z"` or a bare
 * key like `":"` into its modifier flags and final key. The final key may
 * itself be `-` or `+`, so we only strip a leading modifier token when it is
 * immediately followed by `-` and there is a non-empty remainder.
 */
const parseCombo = (combo: string): { key: string } & Modifiers => {
  const mods: Modifiers = {
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
  };
  let rest = combo;

  for (;;) {
    const dash = rest.indexOf("-");
    if (dash <= 0 || dash === rest.length - 1) {
      break;
    }
    const token = rest.slice(0, dash).toLowerCase();
    if (token === "mod") {
      mods[isMac() ? "metaKey" : "ctrlKey"] = true;
      rest = rest.slice(dash + 1);
      continue;
    }
    const flag = MODIFIER_TOKENS[token];
    if (!flag) {
      break;
    }
    mods[flag] = true;
    rest = rest.slice(dash + 1);
  }

  return { key: rest, ...mods };
};

export class WordgardTestChain {
  constructor(public readonly view: Wordgard) {}

  get state() {
    return this.view.state;
  }

  get doc() {
    return this.view.state.doc;
  }

  get selection() {
    return this.view.state.selection;
  }

  /**
   * Dispatch a `keydown` event to the content DOM, running the editor's key
   * bindings. Returns whether the default action was prevented (i.e. a binding
   * handled the key).
   */
  private dispatchKey(key: string, mods: Modifiers): boolean {
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...mods,
    });
    this.view.contentDOM.dispatchEvent(event);
    return event.defaultPrevented;
  }

  /** Insert a single character via wordgard's text-insertion command. */
  private insertChar(char: string): void {
    const { from, to } = this.view.state.selection;
    const bound = Command.bind(insertText, {
      from,
      to,
      insert: char,
      userEvent: "input.type",
    });
    Command.dispatch(this.view, bound);
  }

  /**
   * Type text as a user would: each character is dispatched as a keydown, and
   * inserted as text only when no key binding consumed it.
   */
  insertText(text: string): this {
    for (const char of text) {
      const prevented = this.dispatchKey(char, {
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      });
      if (!prevented) {
        this.insertChar(char);
      }
    }
    return this;
  }

  /**
   * Press a key (e.g. `"Enter"`, `"Escape"`, `"ArrowDown"`, `"Backspace"`).
   * Printable single-character keys that are not consumed by a binding are
   * inserted as text, mirroring {@link insertText}.
   */
  press(key: string): this {
    const prevented = this.dispatchKey(key, {
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
    });
    if (!prevented && [...key].length === 1) {
      this.insertChar(key);
    }
    return this;
  }

  backspace(): this {
    return this.press("Backspace");
  }

  /**
   * Dispatch a keyboard shortcut. Unlike {@link insertText}, a shortcut never
   * inserts text — it only runs matching key bindings.
   */
  shortcut(combo: string): this {
    const { key, ...mods } = parseCombo(combo);
    this.dispatchKey(key, mods);
    return this;
  }

  /**
   * Move the selection. Accepts a numeric position, a `{ from, to }` range, or
   * one of the keywords `"start"`, `"end"` or `"all"`.
   */
  selectText(
    target: number | "start" | "end" | "all" | { from: number; to: number },
  ): this {
    if (target === "all") {
      const spec = selectAll(this.view, null);
      if (spec && typeof spec === "object") {
        this.view.dispatch(spec);
      }
      return this;
    }

    const { state } = this.view;
    let selection: GardSelection;
    if (target === "start") {
      // The CQL document always opens with a `queryStr` textblock; position 1
      // is the first caret position inside it. `near(0)` resolves to the
      // document boundary (outside the textblock), which breaks node-type
      // resolution and typing, so bias one position inward.
      selection = GardSelection.near(state, Math.min(1, state.doc.length));
    } else if (target === "end") {
      // Likewise, the last caret position lives inside the trailing
      // `queryStr`, one position before the document boundary.
      selection = GardSelection.near(state, Math.max(0, state.doc.length - 1));
    } else if (typeof target === "number") {
      selection = GardSelection.near(state, target);
    } else {
      selection = GardSelection.range(target.from, target.to);
    }
    this.view.dispatch({ selection });
    return this;
  }

  then<TResult = void>(
    onFulfilled?: ((value: void) => TResult | PromiseLike<TResult>) | null,
  ): Promise<TResult> {
    return Promise.resolve().then(onFulfilled ?? undefined) as Promise<TResult>;
  }
}
