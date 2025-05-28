import { h, RefObject } from "preact";
import { DateSuggestion } from "../../../lang/types";

export const RelativeDateTab = ({
  suggestion,
  indexOffset,
  currentOptionIndex,
  currentItemRef,
  onSelect,
}: {
  suggestion: DateSuggestion;
  indexOffset: number;
  currentOptionIndex: number;
  currentItemRef: RefObject<HTMLDivElement>;
  onSelect: (value: string) => void;
}) =>
  suggestion.suggestions.map(({ label, value }, index) => {
    const isSelected = index + indexOffset === currentOptionIndex;
    const selectedClass = isSelected ? "Cql__Option--is-selected" : "";

    return (
      <div
        class={`Cql__Option ${selectedClass}`}
        ref={isSelected ? currentItemRef : null}
        onClick={() => onSelect(value)}
      >
        <div class="Cql__OptionLabel">{label}</div>
      </div>
    );
  });
