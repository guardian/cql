import { Popover } from "./Popover";
import {
  MappedTypeaheadSuggestion,
  TextSuggestionOption,
  TypeaheadSuggestion,
} from "../lang/types";
import { EditorView } from "prosemirror-view";

type MenuItem = {
  label: string;
  value: string;
  description: string;
};

export class TypeaheadPopover extends Popover {
  private currentSuggestion: TypeaheadSuggestion | undefined;
  private currentOptionIndex = 0;

  public constructor(
    public view: EditorView,
    public popoverEl: HTMLElement,
    public applySuggestion: (from: number, to: number, value: string) => void
  ) {
    super(popoverEl);
    popoverEl.addEventListener("click", (e: MouseEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.dataset.index !== undefined
      ) {
        this.currentOptionIndex = parseInt(e.target.dataset.index ?? "0");
        this.applyOption();
      }
    });

    view.dom.addEventListener("blur", this.hide);
  }

  public isRenderingNavigableMenu = () => !!this.currentSuggestion?.suggestions;

  public updateItemsFromSuggestions = (
    typeaheadSuggestions: MappedTypeaheadSuggestion[]
  ) => {
    if (
      !typeaheadSuggestions.length ||
      this.view.state.selection.from !== this.view.state.selection.to
    ) {
      this.currentSuggestion = undefined;
      this.currentOptionIndex = 0;
      this.hide();
      return;
    }

    const currentState = this.view.state;

    const suggestionThatCoversSelection = typeaheadSuggestions.find(
      ({ from, to, suggestions }) =>
        currentState.selection.from >= from &&
        currentState.selection.to <= to &&
        Object.keys(suggestions).length
    );

    if (!suggestionThatCoversSelection) {
      this.currentSuggestion = undefined;
      this.hide();
      return;
    }

    this.currentSuggestion = suggestionThatCoversSelection;
    const { from, to, suggestions, type } = suggestionThatCoversSelection;
    if (this.view.isDestroyed) {
      return;
    }
    const { node } = this.view.domAtPos(from);

    this.render(node as HTMLElement);

    if (type === "TEXT") {
      this.renderTextSuggestion(suggestions as MenuItem[]);
    }

    if (type === "DATE") {
      const value = this.view.state.doc.textBetween(from, to);

      this.renderDateSuggestion(value);
    }

    this.show();
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

    this.applySuggestion(from, to, value);
  };

  private moveSelection = (by: number) => {
    const suggestions = this.currentSuggestion?.suggestions ?? [];
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

    if (this.currentOptionIndex !== undefined) {
      const optionEl = this.popoverEl.childNodes.item(this.currentOptionIndex);
      (optionEl as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }

  private renderDateSuggestion(value: string) {
    this.popoverEl.innerHTML = "";
    const dateInput = document.createElement("input");
    dateInput.classList.add("Cql__TypeaheadDateInput");
    dateInput.setAttribute("value", value);
    dateInput.setAttribute("type", "date");
    dateInput.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "Enter": {
          const value = (e.target as HTMLInputElement).value;
          this.applyValueToInput(value);
          this.view.dom.focus();
          break;
        }
        case "Escape": {
          this.view.dom.focus();
          break;
        }
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
}
