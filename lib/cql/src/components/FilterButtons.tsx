import { h } from "preact";

interface FilterButtonsProps {
  onInsertChip: (value: string) => void;
}

const chips = [
  { value: "tag", label: "Tag" },
  { value: "section", label: "Section" },
  { value: "production-office", label: "Production office" },
];

export const FilterButtons = ({ onInsertChip }: FilterButtonsProps) => (
  <div class="cql-field-suggestions-container">
    <div class="cql-field-suggestions-heading">Filter by:</div>
    <div class="cql-field-suggestions">
      {chips.map((chip) => (
        <button
          key={chip.value}
          class="btn-apply-chip-suggestion"
          onClick={() => onInsertChip(chip.value)}
        >
          {chip.label}
        </button>
      ))}
    </div>
  </div>
);
