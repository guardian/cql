import { Mapping } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";
import { CqlError } from "../services/CqlService";
import { Popover } from "./Popover";

export class ErrorPopover extends Popover {
  private debugContainer: HTMLElement | undefined;

  public constructor(
    public view: EditorView,
    public popoverEl: HTMLElement,
    debugEl?: HTMLElement
  ) {
    super(view, popoverEl);
    if (debugEl) {
      this.debugContainer = document.createElement("div");
      debugEl.appendChild(this.debugContainer);
    }
  }

  public updateErrorMessage = async (
    error: CqlError | undefined,
    mapping: Mapping
  ) => {
    if (!error) {
      this.popoverEl.innerHTML = "";
      this.popoverEl.hidePopover();
      return;
    }

    this.updateDebugContainer(error);

    this.popoverEl.innerHTML = error.message;

    await this.renderElementAtPos(
      error.position ? mapping.map(error.position) : undefined
    );

    this.popoverEl.showPopover();
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
}
