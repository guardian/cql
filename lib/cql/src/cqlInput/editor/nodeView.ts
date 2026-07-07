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

  const pos = wg.posAtDOM(chipEl);
  const node = wg.state.doc.resolve(pos).nodeAfter;
  if (!node || node.type !== chipType) {
    return;
  }

  return { pos, node: node as Plot, el: chipEl };
};

/**
 * The polarity handle. Clicking it toggles the chip's polarity (its plot
 * parameter) between "+" (include) and "-" (exclude).
 */
const polarityWidget = Widget.define<string>({
  render: (polarity) => {
    const el = document.createElement("span");
    el.classList.add("Cql__ChipWrapperPolarityHandle");
    el.setAttribute("data-testid", TEST_ID_POLARITY_HANDLE);
    el.setAttribute("contentEditable", "false");
    el.innerHTML = polarityUIMap[polarity] ?? polarityUIMap["+"];
    return el;
  },
  handleEvent: (event, wg) => {
    if (event.type !== "click") {
      return false;
    }

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
  },
});

/**
 * The delete handle. Clicking it removes the whole chip.
 */
const deleteWidget = Widget.create({
  render: () => {
    const el = document.createElement("span");
    el.classList.add("Cql__ChipWrapperDeleteHandle");
    el.setAttribute("contentEditable", "false");
    el.innerHTML = "×";
    return el;
  },
  handleEvent: (event, wg) => {
    if (event.type !== "click") {
      return false;
    }

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
  },
});

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
];
