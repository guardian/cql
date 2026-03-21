import React, { RefObject } from "react";
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
        className={`Cql__Option ${selectedClass}`}
        ref={isSelected ? currentItemRef : null}
        onClick={() => onSelect(value)}
      >
        <div className="Cql__OptionLabel">{label}</div>
      </div>
    );
  });
