import { Popover } from "./Popover";
import {
  MappedTypeaheadSuggestion,
  TextSuggestion,
  TextSuggestionOption,
  TypeaheadSuggestion,
} from "../lang/types";
import { EditorView } from "prosemirror-view";
import { h, FunctionComponent, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

type MenuItem = {
  label: string;
  value: string;
  description: string;
  count?: number;
};

export const CLASS_PENDING = "Cql__Typeahead--pending";
const numberFormat = new Intl.NumberFormat();

type PopoverState = { suggestion: TypeaheadSuggestion };

type PopoverProps = {
  subscribe: (
    sub: ({ suggestion }: { suggestion: TypeaheadSuggestion }) => void
  ) => void;
  onSelect: (value: string) => void;
};

const PopoverComponent: FunctionComponent<PopoverProps> = ({
  subscribe,
  onSelect,
}) => {
  const [state, setState] = useState<PopoverState | undefined>();
  useEffect(() => {
    subscribe((state) => setState(state));
  }, [subscribe]);

  if (!state?.suggestion) {
    return <div>No results</div>;
  }

  switch (state.suggestion.type) {
    case "TEXT":
      return (
        <TextSuggestions
          suggestion={state.suggestion}
          onSelect={onSelect}
        ></TextSuggestions>
      );
    case "DATE":
      return <div>No typeahead for Date yet.</div>;
  }
};

const TextSuggestions = ({
  suggestion,
}: {
  suggestion: TextSuggestion;
  onSelect: (value: string) => void;
}) => {
  const showCount = suggestion.position === "chipValue";
  const showValue = suggestion.position === "chipValue";
  const showDescription = suggestion.position === "chipKey";
  const [currentOptionIndex, setCurrentOptionIndex] = useState(0);
  const currentItemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentOptionIndex !== undefined) {
      currentItemRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [currentOptionIndex]);

  return suggestion.suggestions.map(
    ({ label, description, value, count }, index) => {
      const isSelected = index === currentOptionIndex;
      const selectedClass = isSelected ? "Cql__Option--is-selected" : "";
      return (
        <div
          class={`Cql__Option ${selectedClass}`}
          data-index={index}
          ref={isSelected ? currentItemRef : null}
        >
          <div class="Cql__OptionLabel">
            {label}
            {showCount && count !== undefined ? (
              <div class="Cql__OptionCount">{numberFormat.format(count)}</div>
            ) : undefined}
          </div>
          {showValue ? <div class="Cql__OptionValue">{value}</div> : undefined}
          {showDescription && description ? (
            <div class="Cql__OptionDescription">{description}</div>
          ) : undefined}
        </div>
      );
    }
  );
};

export class TypeaheadPopover extends Popover {
  private currentSuggestion: TypeaheadSuggestion | undefined;
  private currentOptionIndex = 0;
  private isPending = false;
  private listener: ((state: PopoverState) => void) | undefined;

  public constructor(
    public view: EditorView,
    public popoverEl: HTMLElement,
    public applySuggestion: (from: number, to: number, value: string) => void
  ) {
    super(popoverEl);

    render(
      <PopoverComponent
        subscribe={(listener) => (this.listener = listener)}
        onSelect={this.applyValueToInput}
      />,
      popoverEl
    );

    // Mousedown is fired before blur events are triggered. The blur event will
    // close the popover, so we use mousedown rather than click here.
    // popoverEl.addEventListener("mousedown", this.handleClickOrTouchSelection);
    // popoverEl.addEventListener("touchstart", this.handleClickOrTouchSelection);

    view.dom.addEventListener("blur", this.hide);
  }

  public isRenderingNavigableMenu = () => !!this.currentSuggestion?.suggestions;

  public updateItemsFromSuggestions = (
    typeaheadSuggestions: MappedTypeaheadSuggestion[]
  ) => {
    this.isPending = false;
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
      ({ from, to }) =>
        currentState.selection.from >= from && currentState.selection.to <= to
    );

    if (!suggestionThatCoversSelection) {
      this.currentSuggestion = undefined;
      this.hide();
      return;
    }

    this.currentSuggestion = suggestionThatCoversSelection;
    const { from, to, type } = suggestionThatCoversSelection;
    if (this.view.isDestroyed) {
      return;
    }

    // if (type === "TEXT") {
    //   this.renderTextSuggestion(
    //     suggestionThatCoversSelection.suggestions as MenuItem[]
    //   );
    // }

    // if (type === "DATE") {
    //   const value = this.view.state.doc.textBetween(from, to);

    //   this.renderDateSuggestion(value);
    // }

    const { node } = this.view.domAtPos(from);
    this.listener?.({ suggestion: this.currentSuggestion });
    this.show(node as HTMLElement);
  };

  public moveSelectionUp = () => this.moveSelection(-1);

  public moveSelectionDown = () => this.moveSelection(1);

  public setIsPending = () => {
    this.isPending = true;
  };

  private updateRenderer = () => {
    this.listener?.({
      suggestion: this.currentSuggestion,
      isPending: this.isPending,
    });
  };

  private applyValueToInput = (value: string) => {
    if (!this.currentSuggestion) {
      return;
    }

    const { from, to } = this.currentSuggestion;

    this.hide();
    this.applySuggestion(from, to, value);
  };

  private moveSelection = (by: number) => {
    const suggestions = this.currentSuggestion?.suggestions ?? [];
    this.currentOptionIndex =
      (this.currentOptionIndex + by + (by < 0 ? suggestions.length! : 0)) %
      suggestions.length!;
    this.renderTextSuggestion(suggestions as MenuItem[]);
  };

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
