
import { h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { TextSuggestion } from "../../../lang/types";

const numberFormat = new Intl.NumberFormat();

export const TextSuggestionContent = ({
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