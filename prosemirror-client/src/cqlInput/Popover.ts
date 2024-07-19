import { arrow, computePosition, flip, offset, shift } from "@floating-ui/dom";
import { EditorView } from "prosemirror-view";

export abstract class Popover {
  public constructor(public view: EditorView, public popoverEl: HTMLElement) {}

  protected async renderElementAtPos(position: number | undefined) {
    const element = this.getVirtualElementFromView(position);

    if (!element) {
        return;
    }

    const { x, y } = await computePosition(element, this.popoverEl, {
      placement: "bottom-start",
      middleware: [flip(), shift(), offset({ mainAxis: 15, crossAxis: -30 }), arrow()],
    });

    this.popoverEl.setAttribute("style", `left: ${x}px; top: ${y}px`);
  }

  private getVirtualElementFromView = (
    position: number | undefined
  ):
    | undefined
    | {
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
      } => {
    if (position) {
      try {
        const { top, right, bottom, left } = this.view.coordsAtPos(position);
        return {
          getBoundingClientRect: () => {
            const a = {
              width: right - left,
              height: bottom - top,
              x: left,
              y: top,
              top,
              left,
              right,
              bottom,
            };
            console.log(a);
            return a;
          },
        };
      } catch (e) {
        return undefined;
      }
    }

    return this.view.dom;
  };
}
