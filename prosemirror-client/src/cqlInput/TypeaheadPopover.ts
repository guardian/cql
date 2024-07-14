import { Mapping } from "prosemirror-transform";
import { TypeaheadSuggestion } from "../services/CqlService";
import { findNodeAt } from "./utils";
import { EditorView } from "prosemirror-view";
import { chip, schema } from "./schema";
import { Selection, TextSelection } from "prosemirror-state";

type MenuItem = {
  label: string;
  value: string;
  description: string;
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
      if (
        e.target instanceof HTMLElement &&
        e.target.dataset.index !== undefined
      ) {
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
      const currentState = this.view.state;
      const mappedSuggestions = suggestions.map((suggestion) => {
        const start = mapping.map(suggestion.from, -1);
        const end = mapping.map(suggestion.to);
        return { ...suggestion, from: start, to: end };
      });

      this.updateDebugSuggestions(mappedSuggestions);

      const suggestionThatCoversSelection = mappedSuggestions.find(
        ({ from, to, suggestions }) =>
          currentState.selection.from >= from &&
          currentState.selection.to <= to &&
          Object.keys(suggestions).length
      );

      if (suggestionThatCoversSelection) {
        this.currentSuggestion = suggestionThatCoversSelection;
        const { from, to, suggestions } = suggestionThatCoversSelection;
        const chipPos = findNodeAt(from, currentState.doc, chip);
        const domSelectionAnchor = this.view.nodeDOM(chipPos) as HTMLElement;

        if (!domSelectionAnchor) {
          this.popoverEl.hidePopover();
          return;
        }

        const { left } = domSelectionAnchor.getBoundingClientRect();
        this.popoverEl.style.left = `${left}px`;

        if (suggestions.TextSuggestion) {
          this.renderTextSuggestion(suggestions.TextSuggestion.suggestions);
        }

        if (suggestions.DateSuggestion) {
          const value = this.view.state.doc.textBetween(from, to);

          this.renderDateSuggestion(value);
        }

        this.popoverEl.showPopover?.();
      } else {
        this.currentSuggestion = undefined;
        this.popoverEl.hidePopover?.();
      }
    } else {
      this.currentSuggestion = undefined;
      this.popoverEl.hidePopover?.();
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

    this.applyValueToInput(suggestion.value);
  };

  private applyValueToInput = (value: string) => {
    if (!this.currentSuggestion) {
      return;
    }

    const { from, to } = this.currentSuggestion;
    const tr = this.view.state.tr;

    this.view.dispatch(
      tr.replaceRangeWith(from, to, schema.text(value)).setSelection(
        // +1 to tip the selection into the next available node's text
        // position after applying the suggestion e.g. key -> value, value ->
        // searchText
        TextSelection.near(tr.doc.resolve(from + value.length + 1))
      )
    );
  };

  private moveSelection = (by: number) => {
    const suggestions =
      this.currentSuggestion?.suggestions.TextSuggestion?.suggestions!;
    this.currentOptionIndex =
      (this.currentOptionIndex + by + (by < 0 ? suggestions.length! : 0)) %
      suggestions.length!;
    this.renderTextSuggestion(suggestions!);
  };

  private renderTextSuggestion(items: MenuItem[]) {
    this.popoverEl.innerHTML = items
      .map(({ label, description }, index) => {
        return `<div class="Cql__Option ${
          index === this.currentOptionIndex ? "Cql__Option--is-selected" : ""
        }" data-index="${index}"><div class="Cql__OptionLabel">${label}</div><div class="Cql__OptionDescription">${description}</div></div>`;
      })
      .join("");
  }

  private renderDateSuggestion(value: string) {
    this.popoverEl.innerHTML = "";
    const dateInput = document.createElement("input");
    dateInput.classList.add("Cql_typeahead-date");
    dateInput.setAttribute("value", value);
    dateInput.setAttribute("type", "date");
    dateInput.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "Enter":
          const value = (e.target as HTMLInputElement).value;
          this.applyValueToInput(value);
          this.view.dom.focus();
          break;
        case "Escape":
          this.view.dom.focus();
          break;
      }
    });

    this.popoverEl.appendChild(dateInput);
    const maybeValidDate = new Date(value);
    const isDateValid =
      maybeValidDate instanceof Date && isFinite(maybeValidDate.getTime());
    if (!isDateValid) {
      dateInput.focus();
    }
  }

  private updateDebugSuggestions = (suggestions: TypeaheadSuggestion[]) => {
    if (this.debugContainer) {
      this.debugContainer.innerHTML = `
        <h2>Typeahead</h3>
            <p>Current selection: ${this.view.state.selection.from}-${
        this.view.state.selection.to
      }
            </p>
            
      <div>${suggestions.map((suggestion) =>
        JSON.stringify(suggestion, undefined, "  ")
      )}</div>`;
    }
  };
}
