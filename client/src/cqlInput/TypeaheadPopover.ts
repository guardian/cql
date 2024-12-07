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
  count?: number;
};

export class TypeaheadPopover extends Popover {
  private currentSuggestion: TypeaheadSuggestion | undefined;
  private currentOptionIndex = 0;
  private numberFormat = new Intl.NumberFormat();

  public constructor(
    public view: EditorView,
    public popoverEl: HTMLElement,
    public applySuggestion: (from: number, to: number, value: string) => void
  ) {
    super(popoverEl);

    // Mousedown is fired before blur events are triggered. The blur event will
    // close the popover, so we use mousedown rather than click here.
    popoverEl.addEventListener("mousedown", this.handleClickOrTouchSelection);
    popoverEl.addEventListener("touchstart", this.handleClickOrTouchSelection);

    view.dom.addEventListener("blur", this.hide);
  }

  private handleClickOrTouchSelection = (e: Event) => {
    if (!(e.target instanceof HTMLElement)) {
      return;
    }

    const optionEl = e.target.closest("[data-index]");
    if (
      optionEl instanceof HTMLElement &&
      optionEl.dataset.index !== undefined
    ) {
      this.currentOptionIndex = parseInt(optionEl.dataset.index ?? "0");
      this.applyOption();
    }
  };

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
    const showCount = this.currentSuggestion?.position === "chipValue";
    const showValue = this.currentSuggestion?.position === "chipValue";
    const showDescription = this.currentSuggestion?.position === "chipKey";
    this.popoverEl.innerHTML = items
      .map(({ label, description, value, count }, index) => {
        return `<div class="Cql__Option ${
          index === this.currentOptionIndex ? "Cql__Option--is-selected" : ""
        }" data-index="${index}"><div class="Cql__OptionLabel">${label}${showCount && count !== undefined ? `<div class="Cql__OptionCount">${this.numberFormat.format(count)}</div>` : ""}</div>${showValue ? `<div class="Cql__OptionValue">${value}</div>` : ""}${
          showDescription && description
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
