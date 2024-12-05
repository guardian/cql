import { EditorView } from "prosemirror-view";
import { CqlError } from "../services/CqlService";
import { Popover } from "./Popover";
import { CLASS_ERROR, CLASS_VISIBLE } from "./editor/plugin";

export class ErrorPopover extends Popover {
  private debugContainer: HTMLElement | undefined;
  private contentEl: HTMLElement;
  private visibilityTimeout: ReturnType<typeof setTimeout> | undefined;

  public constructor(
    protected view: EditorView,
    protected popoverEl: HTMLElement,
    private errorMsgEl: HTMLElement,
    debugEl?: HTMLElement,
    private debounceTime = 500
  ) {
    super(popoverEl);

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
      this.hideErrorMessages();
      return;
    }

    this.updateDebugContainer(error);
    this.debouncedShowErrorMessages(error);
  };

  private updateDebugContainer = (error: CqlError) => {
    if (this.debugContainer) {
      this.debugContainer.innerHTML = `
        <h2>Error</h2>
        <div>Position: ${error.position ?? "No position given"}</div>
        <div>Message: ${error.message}</div>
      `;
    }
  };

  public hideErrorMessages = () => {
    clearTimeout(this.visibilityTimeout);

    this.contentEl.innerHTML = "";
    this.errorMsgEl.innerHTML = "";
    this.errorMsgEl.classList.remove(CLASS_VISIBLE);
    this.popoverEl.classList.remove(CLASS_VISIBLE);
    this.popoverEl.hidePopover?.();
  };

  private debouncedShowErrorMessages = (error: CqlError) => {
    this.visibilityTimeout = setTimeout(() => {
      this.errorMsgEl.innerHTML = error.message;
      this.errorMsgEl.classList.add(CLASS_VISIBLE);

      if (error.position !== undefined) {
        this.popoverEl.showPopover?.();
        this.popoverEl.classList.add(CLASS_VISIBLE);

        const referenceEl =
          this.view.dom.getElementsByClassName(CLASS_ERROR)?.[0];
        if (!referenceEl) {
          console.warn(
            `Attempt to render element popover at position ${error.position}, but no position widget found in document`
          );
          return;
        }

        const xOffset = 0;
        const yOffset = -25;
        this.renderPopover(referenceEl, xOffset, yOffset);
      }
    }, this.debounceTime);
  };
}