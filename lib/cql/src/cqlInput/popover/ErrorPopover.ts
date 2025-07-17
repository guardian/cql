import { EditorView } from "prosemirror-view";
import { CLASS_ERROR, CLASS_VISIBLE, CqlError } from "../editor/plugins/cql";
import { Popover } from "./Popover";

export class ErrorPopover extends Popover {
  private contentEl: HTMLElement;
  private visibilityTimeout: ReturnType<typeof setTimeout> | undefined;

  public constructor(
    protected view: EditorView,
    protected popoverEl: HTMLElement,
    private debounceTime = 500,
  ) {
    super(popoverEl);

    this.contentEl = document.createElement("div");
    popoverEl.appendChild(this.contentEl);

    this.hide();
  }

  public updateErrorMessage = async (error: CqlError | undefined) => {
    if (!error) {
      this.hideErrorMessages();
      return;
    }

    this.debouncedShowErrorMessages(error);
  };

  public hideErrorMessages = () => {
    clearTimeout(this.visibilityTimeout);

    this.contentEl.innerHTML = "";
    this.popoverEl.classList.remove(CLASS_VISIBLE);
    this.hide();
  };

  private debouncedShowErrorMessages = (error: CqlError) => {
    this.visibilityTimeout = setTimeout(() => {
      if (error.position !== undefined) {
        this.popoverEl.classList.add(CLASS_VISIBLE);

        const referenceEl =
          this.view.dom.getElementsByClassName(CLASS_ERROR)?.[0];
        if (!referenceEl) {
          console.warn(
            `Attempt to render element popover at position ${error.position}, but no position widget found in document`,
          );
          return;
        }

        const xOffset = 0;
        const yOffset = -25;
        this.show(referenceEl, xOffset, yOffset);
      }
    }, this.debounceTime);
  };
}
