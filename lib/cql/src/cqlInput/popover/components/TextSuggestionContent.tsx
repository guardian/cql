import { h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { TextSuggestion } from "../../../lang/types";
import { wrapSelection } from "./utils";
import {
  ActionSubscriber,
  CLASS_NO_RESULTS,
  CLASS_PENDING,
} from "../TypeaheadPopover";

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
  // Programmatically scrolling the list to keep the keyboard-selected item in
  // view (see the effect below) moves the options underneath a stationary
  // mouse cursor. Browsers respond to that by firing a "mouseenter" on
  // whichever option ends up under the pointer, which would otherwise hijack
  // keyboard navigation. We ignore hover-driven selection until the mouse
  // physically moves again, so hovering only takes effect after a genuine
  // mouse movement.
  const ignoreHoverRef = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToAction((action) => {
      switch (action) {
        case "up":
          ignoreHoverRef.current = true;
          setCurrentOptionIndex(
            wrapSelection(
              currentOptionIndex,
              -1,
              suggestion.suggestions.length,
            ),
          );
          return true;
        case "down": {
          ignoreHoverRef.current = true;
          setCurrentOptionIndex(
            wrapSelection(currentOptionIndex, 1, suggestion.suggestions.length),
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

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!ignoreHoverRef.current) {
        return;
      }
      ignoreHoverRef.current = false;

      // The mouse may not have left the option it was already over since
      // keyboard navigation began, in which case no further "mouseenter"
      // will fire to select it. Select whatever option is under the pointer
      // on this first genuine movement, so the mouse doesn't have to leave
      // and re-enter the option to regain control.
      // The popover is rendered inside a shadow root, so `event.target` here
      // would be retargeted to the shadow host - we need `composedPath()` to
      // see the actual option element the pointer is over.
      const hoveredOption = event
        .composedPath()
        .find(
          (node): node is Element =>
            node instanceof Element && node.hasAttribute("data-index"),
        );
      const hoveredIndex = hoveredOption?.getAttribute("data-index");
      if (hoveredIndex !== null && hoveredIndex !== undefined) {
        setCurrentOptionIndex(Number(hoveredIndex));
      }
    };
    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Reset the current option if the suggestions change
  useEffect(() => setCurrentOptionIndex(0), [suggestion]);

  if (!suggestion.suggestions.length) {
    return (
      <div class={`Cql__Option ${CLASS_NO_RESULTS}`}>
        <div class="Cql__OptionLabel">No results</div>
      </div>
    );
  }

  const disabledClass = isPending
    ? `Cql__Option--is-disabled ${CLASS_PENDING}`
    : "";

  return (
    <div class="Cql__TextSuggestionContainer">
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
                onMouseEnter={() => {
                  if (!ignoreHoverRef.current) {
                    setCurrentOptionIndex(index);
                  }
                }}
              >
                <div class="Cql__OptionLabel">
                  {label ?? value}
                  {showCount && count !== undefined && (
                    <div class="Cql__OptionCount">
                      {numberFormat.format(count)}
                    </div>
                  )}
                </div>
                {showValue && label !== undefined && (
                  <div class="Cql__OptionValue">{value}</div>
                )}
                {showDescription && description && (
                  <div class="Cql__OptionDescription">{description}</div>
                )}
              </div>
            );
          },
        )}
      </div>
    </div>
  );
};
