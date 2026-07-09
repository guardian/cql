import { Decoration, Widget, Wordgard } from "wordgard/editor";
import { GardState } from "wordgard/state";
import { Plot } from "wordgard/doc";
import { chipKeyTag, chipType, chipValueTag } from "./schema";
import { removeChipCoveringRange } from "./commands";

export const TEST_ID_POLARITY_HANDLE = "polarity-handle";
export const TEST_ID_CHIP_VALUE = "chip-value";

const polarityUIMap: Record<string, string> = {
  "-": "−",
  "+": "+",
};

/**
 * Resolve the `<chip>` element an event originated from, and return its
 * document position and node, if any.
 */
const getChipFromEvent = (
  event: Event,
  wg: Wordgard,
): { pos: number; node: Plot; el: HTMLElement } | undefined => {
  const target = event.target as HTMLElement | null;
  const chipEl = target?.closest("chip") as HTMLElement | null;
  if (!chipEl) {
    return;
  }

  // `posAtDOM` on the chip element resolves to a position inside the chip
  // (its content start), not the chip's own boundary. Walk up to the
  // enclosing chip plot to find the chip node and its document position.
  const pos = wg.posAtDOM(chipEl);
  const $pos = wg.state.doc.resolve(pos);
  const chipPos = $pos.matchingParent((plot) => plot.type === chipType);
  if (!chipPos) {
    return;
  }

  return { pos: chipPos.before, node: chipPos.node as Plot, el: chipEl };
};

/**
 * The polarity handle. Clicking it toggles the chip's polarity (its plot
 * parameter) between "+" (include) and "-" (exclude).
 *
 * The click itself is handled by a `Wordgard.domEventHandler` (see
 * `chipViewExtensions`) rather than the widget's own `handleEvent`, because a
 * widget's `handleEvent` only runs for DOM events wordgard itself processes,
 * and `click` is not one of them.
 */
const POLARITY_HANDLE_CLASS = "Cql__ChipWrapperPolarityHandle";
const DELETE_HANDLE_CLASS = "Cql__ChipWrapperDeleteHandle";

const polarityWidget = Widget.define<string>({
  render: (polarity) => {
    const el = document.createElement("span");
    el.classList.add(POLARITY_HANDLE_CLASS);
    el.setAttribute("data-testid", TEST_ID_POLARITY_HANDLE);
    el.setAttribute("contentEditable", "false");
    el.innerHTML = polarityUIMap[polarity] ?? polarityUIMap["+"];
    return el;
  },
});

const togglePolarityAtEvent = (event: Event, wg: Wordgard): boolean => {
  const chip = getChipFromEvent(event, wg);
  if (!chip) {
    return false;
  }

  const currentPolarity = chip.el.getAttribute("data-polarity") ?? "+";
  const newPolarity = currentPolarity === "+" ? "-" : "+";

  wg.dispatch({
    changes: {
      from: chip.pos,
      to: chip.pos + chip.node.length,
      insert: [chipType.of(newPolarity).create(chip.node.content)],
      fit: true,
    },
  });

  return true;
};

/**
 * The delete handle. Clicking it removes the whole chip.
 */
const deleteWidget = Widget.create({
  render: () => {
    const el = document.createElement("span");
    el.classList.add(DELETE_HANDLE_CLASS);
    el.setAttribute("contentEditable", "false");
    el.innerHTML = "×";
    return el;
  },
});

const removeChipAtEvent = (event: Event, wg: Wordgard): boolean => {
  const chip = getChipFromEvent(event, wg);
  if (!chip) {
    return false;
  }

  const spec = removeChipCoveringRange(chip.pos, chip.pos + chip.node.length)(
    wg,
    null,
  );
  if (spec) {
    wg.dispatch(spec);
  }

  return true;
};

const colonWidget = Widget.create({
  render: () => {
    const el = document.createElement("span");
    el.setAttribute("contentEditable", "false");
    el.innerHTML = ":";
    return el;
  }
})

/**
 * Extensions that render the interactive parts of a chip: the polarity handle
 * (at the chip's start) and the delete handle (at the chip's end), plus the
 * chip value's test id. Read-only styling and the `:` separator on read-only
 * chip keys are handled via CSS keyed off the `data-readonly` attribute added
 * by `readOnlyMark`.
 */
export const chipViewExtensions: GardState.Extension = [
  Decoration.Tag.widget(chipType, "start", (tag) =>
    polarityWidget.of(tag.param),
  ),
  Decoration.Tag.widget(chipType, "end", deleteWidget),
  Decoration.Tag.widget(chipKeyTag, "end", colonWidget),
  Decoration.Tag.attribute(
    chipValueTag.type,
    "data-testid",
    TEST_ID_CHIP_VALUE,
  ),
  // Clicks on the chip handles are dispatched here rather than via each
  // widget's `handleEvent`, which only runs for events wordgard itself
  // processes (`click` is not one of them).
  Wordgard.domEventHandler("click", (event, wg) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest(`.${POLARITY_HANDLE_CLASS}`)) {
      event.preventDefault();
      return togglePolarityAtEvent(event, wg);
    }
    if (target?.closest(`.${DELETE_HANDLE_CLASS}`)) {
      event.preventDefault();
      return removeChipAtEvent(event, wg);
    }
    return false;
  }),
];
