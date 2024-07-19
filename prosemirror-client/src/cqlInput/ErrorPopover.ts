import { Mapping } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";
import { CqlError } from "../services/CqlService";
import { Popover, VirtualElement } from "./Popover";

export class ErrorPopover extends Popover {
  private debugContainer: HTMLElement | undefined;
  private contentEl: HTMLElement;
  private arrowEl: HTMLElement;

  public constructor(
    public view: EditorView,
    public popoverEl: HTMLElement,
    debugEl?: HTMLElement
  ) {
    super(view, popoverEl);

    this.arrowEl = document.createElement("div");
    this.arrowEl.classList.add("Cql__PopoverArrow");
    popoverEl.appendChild(this.arrowEl);

    this.contentEl = document.createElement("div");
    popoverEl.appendChild(this.contentEl);

    if (debugEl) {
      this.debugContainer = document.createElement("div");
      debugEl.appendChild(this.debugContainer);
    }

    popoverEl.hidePopover?.();
  }

  public updateErrorMessage = async (
    error: CqlError | undefined,
    mapping: Mapping
  ) => {
    if (!error) {
      this.contentEl.innerHTML = "";
      this.popoverEl.hidePopover?.();
      return;
    }

    this.updateDebugContainer(error);

    this.contentEl.innerHTML = error.message;

    const referenceEl = this.getVirtualElementFromView(
      error.position ? mapping.map(error.position) - 1 : undefined
    );

    const xOffset = -30;
    await this.renderPopover(referenceEl, this.arrowEl, xOffset);

    this.popoverEl.showPopover?.();
  };

  private updateDebugContainer = (error: CqlError) => {
    if (this.debugContainer) {
      this.debugContainer.innerHTML = `<div>
        <h2>Error</h3>
        <div>Position: ${error.position ?? "No position given"}</div>
        <div>Message: ${error.message}</div>
        </div>`;
    }
  };

  private getVirtualElementFromView = (
    position: number | undefined
  ): VirtualElement => {
    if (position) {
      try {
        const { top, right, bottom, left } = this.view.coordsAtPos(position);
        return {
          getBoundingClientRect: () => ({
            width: right - left,
            height: bottom - top,
            x: left,
            y: top,
            top,
            left,
            right,
            bottom,
          }),
        };
      } catch (e) {
        // Defer to parent input container
      }
    }

    return this.view.dom;
  };
}
