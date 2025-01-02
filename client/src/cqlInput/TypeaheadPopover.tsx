import { Popover } from "./Popover";
import {
  DateSuggestion,
  MappedTypeaheadSuggestion,
  TextSuggestion,
  TypeaheadSuggestion,
} from "../lang/types";
import { EditorView } from "prosemirror-view";
import { h, FunctionComponent, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

export const CLASS_PENDING = "Cql__Typeahead--pending";
const numberFormat = new Intl.NumberFormat();

type PopoverState = {
  suggestion: TypeaheadSuggestion | undefined;
  currentOptionIndex: number;
  isPending: boolean;
};

type PopoverProps = {
  subscribe: (sub: (state: PopoverState) => void) => void;
  onSelect: (value: string) => void;
};

const PopoverComponent: FunctionComponent<PopoverProps> = ({
  subscribe,
  onSelect,
}) => {
  const [state, setState] = useState<PopoverState | undefined>();
  useEffect(() => {
    subscribe((state) => {
      setState(state);
    });
  }, [subscribe]);

  if (!state?.suggestion) {
    return <div>No results</div>;
  }

  switch (state.suggestion.type) {
    case "TEXT":
      return (
        <TextSuggestionComponent
          suggestion={state.suggestion}
          onSelect={onSelect}
          currentOptionIndex={state.currentOptionIndex}
        ></TextSuggestionComponent>
      );
    case "DATE":
      return (
        <DateSuggestionComponent
          suggestion={state.suggestion}
          onSelect={onSelect}
          currentOptionIndex={state.currentOptionIndex}
        ></DateSuggestionComponent>
      );
  }
};

const TextSuggestionComponent = ({
  suggestion,
  onSelect,
  currentOptionIndex,
}: {
  suggestion: TextSuggestion;
  onSelect: (value: string) => void;
  currentOptionIndex: number | undefined;
}) => {
  const showCount = suggestion.position === "chipValue";
  const showValue = suggestion.position === "chipValue";
  const showDescription = suggestion.position === "chipKey";
  const currentItemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentOptionIndex !== undefined) {
      currentItemRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [currentOptionIndex]);

  if (!suggestion.suggestions.length) {
    return (
      <div class="Cql__Option">
        <div class="Cql__OptionLabel">No results</div>
      </div>
    );
  }

  return suggestion.suggestions.map(
    ({ label, description, value, count }, index) => {
      const isSelected = index === currentOptionIndex;
      const selectedClass = isSelected ? "Cql__Option--is-selected" : "";
      return (
        <div
          class={`Cql__Option ${selectedClass}`}
          data-index={index}
          ref={isSelected ? currentItemRef : null}
          onClick={() => onSelect(value)}
        >
          <div class="Cql__OptionLabel">
            {label}
            {showCount && count !== undefined && (
              <div class="Cql__OptionCount">{numberFormat.format(count)}</div>
            )}
          </div>
          {showValue && <div class="Cql__OptionValue">{value}</div>}
          {showDescription && description && (
            <div class="Cql__OptionDescription">{description}</div>
          )}
        </div>
      );
    }
  );
};

const DateSuggestionComponent = ({
  suggestion,
  onSelect,
  currentOptionIndex,
}: {
  suggestion: DateSuggestion;
  onSelect: (value: string) => void;
  currentOptionIndex: number | undefined;
}) => {
  const currentItemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentOptionIndex !== undefined) {
      currentItemRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [currentOptionIndex]);

  return suggestion.suggestions.map(({ label, value }, index) => {
    const isSelected = index === currentOptionIndex;
    const selectedClass = isSelected ? "Cql__Option--is-selected" : "";
    return (
      <div
        class={`Cql__Option ${selectedClass}`}
        data-index={index}
        ref={isSelected ? currentItemRef : null}
        onClick={() => onSelect(value)}
      >
        <div class="Cql__OptionLabel">{label}</div>
      </div>
    );
  });
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
        subscribe={(listener) => {
          this.listener = listener;

          // Ensure the initial state of the renderer is in sync with this class's state.
          this.updateRenderer();
        }}
        onSelect={this.applyValueToInput}
      />,
      popoverEl
    );

    // Prevent the popover from stealing focus from the input
    popoverEl.addEventListener("mousedown", (e) => e.preventDefault());

    // Close the popover when the input loses focus
    view.dom.addEventListener("blur", this.hide);
  }

  public isRenderingNavigableMenu = () => !!this.currentSuggestion?.suggestions;

  public updateItemsFromSuggestions = (
    typeaheadSuggestions: MappedTypeaheadSuggestion[]
  ) => {
    this.isPending = false;
    if (
      this.view.isDestroyed ||
      !typeaheadSuggestions.length ||
      this.view.state.selection.from !== this.view.state.selection.to
    ) {
      this.currentSuggestion = undefined;
      this.currentOptionIndex = 0;
      this.updateRenderer();
      this.hide();
      return;
    }

    const { selection: currentSelection } = this.view.state;
    const suggestionThatCoversSelection = typeaheadSuggestions.find(
      ({ from, to }) =>
        currentSelection.from >= from && currentSelection.to <= to
    );

    if (!suggestionThatCoversSelection) {
      this.currentSuggestion = undefined;
      this.updateRenderer();
      return;
    }

    this.currentSuggestion = suggestionThatCoversSelection;

    const { node } = this.view.domAtPos(this.currentSuggestion.from);
    this.updateRenderer();
    this.show(node as HTMLElement);
  };

  public moveSelectionUp = () => this.moveSelection(-1);

  public moveSelectionDown = () => this.moveSelection(1);

  public applyOption = () => {
    const suggestion =
      this.currentSuggestion?.suggestions[this.currentOptionIndex];

    if (!this.currentSuggestion || !suggestion) {
      console.warn(
        `No option available with current suggestion at index ${this.currentOptionIndex}`
      );

      return;
    }

    this.applyValueToInput(suggestion.value);
  };

  public setIsPending = () => {
    this.isPending = true;
  };

  private updateRenderer = () => {
    this.listener?.({
      suggestion: this.currentSuggestion,
      isPending: this.isPending,
      currentOptionIndex: this.currentOptionIndex,
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
    this.updateRenderer();
  };
}
