import { Mapping } from "prosemirror-transform";
import { TypeaheadSuggestion } from "../CqlService";
import { findNodeAt } from "./utils";
import { EditorView } from "prosemirror-view";
import { chip } from "./schema";

type MenuItem = {
  label: string;
  value: string;
};

export class TypeaheadPopover {
  private debugContainer: HTMLElement | undefined;
  private currentSuggestion: TypeaheadSuggestion | undefined;

  public constructor(
    public view: EditorView,
    public popoverEl: HTMLElement,
    debugEl?: HTMLElement
  ) {
    if (debugEl) {
      this.debugContainer = document.createElement("div");
      debugEl.appendChild(this.debugContainer);
    }
  }

  public isRenderingNavigableMenu = () =>
    !!this.currentSuggestion?.suggestions.TextSuggestion;

  public updateItemsFromSuggestions = (
    suggestions: TypeaheadSuggestion[],
    mapping: Mapping
  ) => {
    if (
      suggestions.length &&
      this.view.state.selection.from === this.view.state.selection.to
    ) {
      const mappedSuggestions = suggestions.map((suggestion) => {
        const start = mapping.map(suggestion.from);
        const end = mapping.map(suggestion.to);
        return { ...suggestion, from: start, to: end };
      });

      this.updateDebugSuggestions(mappedSuggestions);

      const suggestionThatCoversSelection = mappedSuggestions.find(
        ({ from, to, suggestions }) =>
          this.view.state.selection.from >= from &&
          this.view.state.selection.to <= to &&
          !!suggestions.TextSuggestion
      );

      if (suggestionThatCoversSelection) {
        this.currentSuggestion = suggestionThatCoversSelection;
        const { from, suggestions } = suggestionThatCoversSelection;
        const chipPos = findNodeAt(from, this.view.state.doc, chip);
        const domSelectionAnchor = this.view.nodeDOM(chipPos) as HTMLElement;
        const { left } = domSelectionAnchor.getBoundingClientRect();
        this.popoverEl.style.left = `${left}px`;

        if (suggestions.TextSuggestion) {
          this.updateItems(suggestions.TextSuggestion.suggestions);
        }

        this.popoverEl.showPopover();
      } else {
        this.currentSuggestion = undefined;
        this.popoverEl.hidePopover();
      }
    } else {
      this.currentSuggestion = undefined;
      this.popoverEl.hidePopover();
      this.popoverEl.innerHTML = "";
    }
  };

  private updateItems(items: MenuItem[]) {
    this.popoverEl.innerHTML = items
      .map(({ label, value }) => {
        return `<div data-value="${value}">${label}</div>`;
      })
      .join("");
  }

  private updateDebugSuggestions = (suggestions: TypeaheadSuggestion[]) => {
    if (this.debugContainer) {
      this.debugContainer.innerHTML = `<h2>Typeahead</h3><p>Current selection: ${
        this.view.state.selection.from
      }-${this.view.state.selection.to}</p>
      <div>${suggestions.map((suggestion) =>
        JSON.stringify(suggestion, undefined, "  ")
      )}</div>`;
    }
  };
}
