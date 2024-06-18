import { Mapping } from "prosemirror-transform";
import { TypeaheadSuggestion } from "../CqlService";
import { findNodeAt } from "./utils";
import { EditorView } from "prosemirror-view";
import { chip, schema } from "./schema";

type MenuItem = {
  label: string;
  value: string;
};

export class TypeaheadPopover {
  private debugContainer: HTMLElement | undefined;
  private currentSuggestion: TypeaheadSuggestion | undefined;
  private currentOptionIndex = 0;

  public constructor(
    public view: EditorView,
    public popoverEl: HTMLElement,
    debugEl?: HTMLElement
  ) {
    popoverEl.addEventListener("click", (e: MouseEvent) => {
      if (e.target instanceof HTMLElement && e.target.dataset.index !== undefined) {
        this.currentOptionIndex = parseInt(e.target.dataset.index ?? "0");
        this.applyOption();
      }
    });

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
        const start = mapping.map(suggestion.from, -1);
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

  public moveSelectionUp = () => this.moveSelection(-1);

  public moveSelectionDown = () => this.moveSelection(1);

  public applyOption = () => {
    const suggestion =
      this.currentSuggestion?.suggestions.TextSuggestion?.suggestions[
        this.currentOptionIndex
      ];

    if (!this.currentSuggestion || !suggestion) {
      console.warn(
        `No option available with current suggestion at index ${this.currentOptionIndex}`
      );

      return;
    }

    const { from, to } = this.currentSuggestion;

    this.view.dispatch(
      this.view.state.tr.replaceRangeWith(
        from,
        to,
        schema.text(suggestion.value)
      )
    );
  };

  private moveSelection = (by: number) => {
    const suggestions =
      this.currentSuggestion?.suggestions.TextSuggestion?.suggestions!;
    this.currentOptionIndex =
      (this.currentOptionIndex + by + (by < 0 ? suggestions.length! : 0)) %
      suggestions.length!;
    this.updateItems(suggestions!);
  };

  private updateItems(items: MenuItem[]) {
    this.popoverEl.innerHTML = items
      .map(({ label }, index) => {
        return `<div class="Cql__Option ${
          index === this.currentOptionIndex ? "Cql__Option--is-selected" : ""
        }" data-index="${index}">${label}</div>`;
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

  private selectItem(itemValue: string) {
    console.log({ itemValue });
  }
}
