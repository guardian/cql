import { h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
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
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    if (currentOptionIndex !== undefined) {
      currentItemRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [currentOptionIndex]);

  const tabs = [
    {
      label: "Relative",
      content: suggestion.suggestions.map(({ label, value }, index) => {
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
      }),
    },
    {
      label: "Absolute",
      content: (
        <div class="Cql__Option">
          <input
            class="Cql__Input"
            autoFocus
            type="date"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSelect((e.target as HTMLInputElement).value);
              }
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div class="Cql__PopoverTab">
      <div class="Cql__PopoverTabList">
        {tabs.map(({ label }, index) => (
          <div
            class={`Cql__PopoverTabItem ${index === tabIndex && "Cql__PopoverTabItem--active"}`}
            onClick={() => setTabIndex(index)}
          >
            {label}
          </div>
        ))}
      </div>
      <div class="Cql__PopoverTabContent">{tabs[tabIndex].content}</div>
    </div>
  );
};
