import { computePosition, flip, offset, shift } from "@floating-ui/dom";
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
    xOffset: number = 0,
    yOffset: number = 0
  ) {
    const { x, y } = await computePosition(referenceElement, this.popoverEl, {
      placement: "bottom-start",
      middleware: [
        flip(),
        shift(),
        offset({ mainAxis: yOffset, crossAxis: xOffset }),
      ],
    });

    this.popoverEl.style.left = `${x}px`;
    this.popoverEl.style.top = `${y}px`;
  }
}
