import { h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { DateSuggestion } from "../../../lang/types";

export const DateSuggestionContent = ({
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
