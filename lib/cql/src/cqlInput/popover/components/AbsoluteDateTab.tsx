import { h, RefObject } from "preact";
import { useState } from "preact/hooks";

export const AbsoluteDateTab = ({
  dateInputRef,
  onSelect,
  closePopover,
}: {
  dateInputRef: RefObject<HTMLInputElement>;
  onSelect: (value: string) => void;
  closePopover: () => void;
}) => {
  const [absoluteDate, setAbsoluteDate] = useState("");
  return (
    <div class="Cql__Option Cql__AbsoluteDateOption">
      <input
        class="Cql__Input"
        ref={dateInputRef}
        type="date"
        value={absoluteDate}
        onInput={(e) => setAbsoluteDate((e.target as HTMLInputElement).value)}
        onKeyDown={(e) => {
          switch (e.key) {
            case "Enter": {
              onSelect(absoluteDate);
              return;
            }
            case "Escape": {
              closePopover();
              return;
            }
          }
        }}
      />
      <button
        class="Cql__Button"
        onClick={() =>
          dateInputRef.current && onSelect(dateInputRef.current?.value)
        }
      >
        Apply
      </button>
    </div>
  );
};
