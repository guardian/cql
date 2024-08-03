import { EditorView } from "prosemirror-view";
import { CqlError } from "../services/CqlService";
import { Popover } from "./Popover";
import { ERROR_CLASS } from "./plugin";

export class ErrorPopover extends Popover {
  private debugContainer: HTMLElement | undefined;
  private contentEl: HTMLElement;

  public constructor(
    protected view: EditorView,
    protected popoverEl: HTMLElement,
    private errorMsgEl: HTMLElement,
    debugEl?: HTMLElement
  ) {
    super(view, popoverEl);

    this.contentEl = document.createElement("div");
    popoverEl.appendChild(this.contentEl);

    if (debugEl) {
      this.debugContainer = document.createElement("div");
      debugEl.appendChild(this.debugContainer);
    }

    popoverEl.hidePopover?.();
  }

  public updateErrorMessage = async (error: CqlError | undefined) => {
    if (!error) {
      this.contentEl.innerHTML = "";
      this.errorMsgEl.innerHTML = "";
      this.popoverEl.hidePopover?.();
      return;
    }

    this.updateDebugContainer(error);

    this.errorMsgEl.innerHTML = error.message;

    if (!error.position) {
      this.popoverEl.hidePopover?.();
      return;
    }

    const referenceEl = this.view.dom.getElementsByClassName(ERROR_CLASS)?.[0];
    if (!referenceEl) {
      console.warn(
        `Attempt to render element popover at position ${error.position}, but no position widget found in document`
      );
      return;
    }

    const xOffset = 0;
    const yOffset = -25;
    await this.renderPopover(referenceEl, xOffset, yOffset);

    this.popoverEl.showPopover?.();
  };

  private updateDebugContainer = (error: CqlError) => {
    if (this.debugContainer) {
      this.debugContainer.innerHTML = `<div>
        <h2>Error</h2>
        <div>Position: ${error.position ?? "No position given"}</div>
        <div>Message: ${error.message}</div>
        </div>`;
    }
  };
}
