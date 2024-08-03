import { EditorView } from "prosemirror-view";
import { CqlError } from "../services/CqlService";
import { Popover } from "./Popover";
import { ERROR_CLASS, VISIBLE_CLASS } from "./plugin";

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
      this.hideErrorMessages();
      console.log('hide');
      return;
    }

    this.updateDebugContainer(error);

    this.errorMsgEl.innerHTML = error.message;
    this.debouncedShowErrorMessages();

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

  public hideErrorMessages = () => {
    clearTimeout(this.visibilityTimeout);

    this.contentEl.innerHTML = "";
    this.errorMsgEl.innerHTML = "";
    this.errorMsgEl.classList.remove(VISIBLE_CLASS);
    this.popoverEl.classList.remove(VISIBLE_CLASS);
    this.popoverEl.hidePopover?.();
  };

  private debouncedShowErrorMessages = () => {
    console.log('defer show')
    this.visibilityTimeout = setTimeout(() => {
      console.log('shot')
      this.popoverEl.showPopover?.();
      this.errorMsgEl.classList.add(VISIBLE_CLASS);
      this.popoverEl.classList.add(VISIBLE_CLASS);
    }, this.debounceTime);
  };
}
