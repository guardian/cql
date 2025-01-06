import { h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { TextSuggestion } from "../../../lang/types";
import { ActionSubscriber } from "./PopoverContainer";
import { wrapSelection } from "./utils";
import { CLASS_PENDING } from "../TypeaheadPopover";

const numberFormat = new Intl.NumberFormat();

export const TextSuggestionContent = ({
  suggestion,
  isPending,
  onSelect,
  subscribeToAction,
}: {
  suggestion: TextSuggestion;
  isPending: boolean;
  onSelect: (value: string) => void;
  subscribeToAction: ActionSubscriber;
}) => {
  const showCount = suggestion.position === "chipValue";
  const showValue = suggestion.position === "chipValue";
  const showDescription = suggestion.position === "chipKey";
  const currentItemRef = useRef<HTMLDivElement | null>(null);
  const [currentOptionIndex, setCurrentOptionIndex] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToAction((action) => {
      switch (action) {
        case "up":
          setCurrentOptionIndex(
            wrapSelection(currentOptionIndex, -1, suggestion.suggestions.length)
          );
          return true;
        case "down": {
          setCurrentOptionIndex(
            wrapSelection(currentOptionIndex, 1, suggestion.suggestions.length)
          );
          return true;
        }
        case "enter": {
          onSelect(suggestion.suggestions[currentOptionIndex].value);
          return true;
        }
        default: {
          break;
        }
      }
    });

    return unsubscribe;
  }, [subscribeToAction, currentOptionIndex, suggestion]);

  useEffect(() => {
    if (currentOptionIndex !== undefined) {
      currentItemRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [currentOptionIndex]);

  // Reset the current option if the suggestions change
  useEffect(() => setCurrentOptionIndex(0), [suggestion]);

  if (!suggestion.suggestions.length) {
    return (
      <div class="Cql__Option">
        <div class="Cql__OptionLabel">No results</div>
      </div>
    );
  }

  const disabledClass = isPending
    ? `Cql__Option--is-disabled ${CLASS_PENDING}`
    : "";

  return (
    <div class="Cql__TextSuggestionContent">
      {suggestion.suggestions.map(
        ({ label, description, value, count }, index) => {
          const isSelected = index === currentOptionIndex;
          const selectedClass = isSelected ? "Cql__Option--is-selected" : "";
          return (
            <div
              class={`Cql__Option ${selectedClass} ${disabledClass}`}
              data-index={index}
              ref={isSelected ? currentItemRef : null}
              onClick={() => onSelect(value)}
            >
              <div class="Cql__OptionLabel">
                {label}
                {showCount && count !== undefined && (
                  <div class="Cql__OptionCount">
                    {numberFormat.format(count)}
                  </div>
                )}
              </div>
              {showValue && <div class="Cql__OptionValue">{value}</div>}
              {showDescription && description && (
                <div class="Cql__OptionDescription">{description}</div>
              )}
            </div>
          );
        }
      )}
    </div>
  );
};
