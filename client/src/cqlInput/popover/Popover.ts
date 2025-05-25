import { computePosition, flip, offset, shift } from "@floating-ui/dom";

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

// Used to provide a testing hook for visibility.
export const isVisibleDataAttr = "isvisible";

export abstract class Popover {
  protected isVisible = false;
  protected updateRenderer = () => {};

  public constructor(protected popoverEl: HTMLElement) {}

  /**
   * Hide the popover. Use the hide/show methods, rather than hiding and showing
   * the element directly in inheriting classes, to ensure that testing attributes
   * are set.
   */
  public hide() {
    this.isVisible = false;
    this.updateRenderer();
    this.popoverEl.hidePopover?.();
    this.popoverEl.dataset[isVisibleDataAttr] = "false";
  }

  /**
   * Show the popover.
   */
  protected async show(
    referenceElement: VirtualElement,
    xOffset: number = 0,
    yOffset: number = 0,
  ) {
    this.isVisible = true;
    this.updateRenderer();
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
    this.popoverEl.showPopover?.();
    this.popoverEl.dataset[isVisibleDataAttr] = "true";
  }
}
