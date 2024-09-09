import { Mapping } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";
import { schema } from "./schema";
import { TextSelection } from "prosemirror-state";
import { Popover } from "./Popover";
import { TextSuggestionOption, TypeaheadSuggestion } from "../lang/types";

type MenuItem = {
  label: string;
  value: string;
  description: string;
};

export class TypeaheadPopover extends Popover {
  private debugContainer: HTMLElement | undefined;
  private currentSuggestion: TypeaheadSuggestion | undefined;
  private currentOptionIndex = 0;

  public constructor(
    public view: EditorView,
    public popoverEl: HTMLElement,
    debugEl?: HTMLElement
  ) {
    super(view, popoverEl);
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

  public isRenderingNavigableMenu = () => !!this.currentSuggestion?.suggestions;

  public updateItemsFromSuggestions = (
    typeaheadSuggestions: TypeaheadSuggestion[],
    mapping: Mapping
  ) => {
    if (
      !typeaheadSuggestions.length ||
      this.view.state.selection.from !== this.view.state.selection.to
    ) {
      this.currentSuggestion = undefined;
      this.popoverEl.hidePopover?.();
      this.popoverEl.innerHTML = "";
      return;
    }

    const currentState = this.view.state;
    const mappedSuggestions = typeaheadSuggestions.map((suggestion) => {
      const start = mapping.map(suggestion.from, -1);
      const end = mapping.map(suggestion.to);
      return { ...suggestion, from: start, to: end } as TypeaheadSuggestion;
    });

    this.updateDebugSuggestions(mappedSuggestions);

    const suggestionThatCoversSelection = mappedSuggestions.find(
      ({ from, to, suggestions }) =>
        currentState.selection.from >= from &&
        currentState.selection.to <= to &&
        Object.keys(suggestions).length
    );

    if (!suggestionThatCoversSelection) {
      this.currentSuggestion = undefined;
      this.popoverEl.hidePopover?.();
      return;
    }

    this.currentSuggestion = suggestionThatCoversSelection;
    const { from, to, suggestions, type } = suggestionThatCoversSelection;
    const { node } = this.view.domAtPos(from);

    this.renderPopover(node as HTMLElement);

    if (type === "TEXT") {
      this.renderTextSuggestion(suggestions as MenuItem[]);
    }

    if (type === "DATE") {
      const value = this.view.state.doc.textBetween(from, to);

      this.renderDateSuggestion(value);
    }

    this.popoverEl.showPopover?.();
  };

  public moveSelectionUp = () => this.moveSelection(-1);

  public moveSelectionDown = () => this.moveSelection(1);

  public applyOption = () => {
    const suggestion = this.currentSuggestion?.suggestions[
      this.currentOptionIndex
    ] as TextSuggestionOption;

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
    const suggestions = this.currentSuggestion?.suggestions!;
    this.currentOptionIndex =
      (this.currentOptionIndex + by + (by < 0 ? suggestions.length! : 0)) %
      suggestions.length!;
    this.renderTextSuggestion(suggestions as MenuItem[]);
  };

  private renderTextSuggestion(items: MenuItem[]) {
    this.popoverEl.innerHTML = items
      .map(({ label, description }, index) => {
        return `<div class="Cql__Option ${
          index === this.currentOptionIndex ? "Cql__Option--is-selected" : ""
        }" data-index="${index}"><div class="Cql__OptionLabel">${label}</div>${
          description
            ? `<div class="Cql__OptionDescription">${description}</div>`
            : ""
        }</div>`;
      })
      .join("");
  }

  private renderDateSuggestion(value: string) {
    this.popoverEl.innerHTML = "";
    const dateInput = document.createElement("input");
    dateInput.classList.add("Cql__TypeaheadDateInput");
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
        <h2>Typeahead</h2>
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
