import { arrow, computePosition, flip, offset, shift } from "@floating-ui/dom";
import { EditorView } from "prosemirror-view";

export type VirtualElement = {
  getBoundingClientRect: () => {
    width: number;
    height: number;
    x: number;
    y: number;
    top: number;
    left: number;
    right: number;
    bottom: number;
  };
};

export abstract class Popover {
  public constructor(
    protected view: EditorView,
    protected popoverEl: HTMLElement
  ) {}

  protected async renderPopover(
    referenceElement: VirtualElement,
    arrowEl?: HTMLElement,
    xOffset: number = 0
  ) {
    const {
      x,
      y,
      middlewareData: { arrow: arrowData },
    } = await computePosition(referenceElement, this.popoverEl, {
      placement: "bottom-start",
      middleware: [
        flip(),
        shift(),
        offset({ mainAxis: 15, crossAxis: xOffset }),
        ...(arrowEl ? [arrow({ element: arrowEl })] : []),
      ],
    });

    this.popoverEl.style.left = `${x}px`;
    this.popoverEl.style.right = `${y}px`;

    if (arrowEl && arrowData) {
      const { x, y } = arrowData;

      arrowEl.style.left = x !== undefined ? `${x}px` : "";
      arrowEl.style.top = y !== undefined ? `${y}px` : "";
    }
  }
}
