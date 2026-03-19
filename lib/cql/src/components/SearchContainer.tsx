import { h } from "preact";
import { CqlInputWrapper } from "./CqlInputWrapper";
import { FilterButtons } from "./FilterButtons";
import { DebugChangeEventDetail } from "../types/dom";
import { DataSource } from "./ConfigPanel";
import { useRef } from "preact/hooks";

interface SearchContainerProps {
  dataSource: DataSource;
  value: string;
  onQueryChange: (queryStr: string, error?: string) => void;
  onDebugChange: (detail: DebugChangeEventDetail) => void;
}

export const SearchContainer = ({
  dataSource,
  value,
  onQueryChange,
  onDebugChange,
}: SearchContainerProps) => {
  const cqlInputRef = useRef<HTMLElement | null>(null);

  const handleInsertChip = (value: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cqlInputRef.current as any)?.insertChip?.(value);
  };

  return (
    <div class="cql-search-container">
      <CqlInputWrapper
        dataSource={dataSource}
        value={value}
        onQueryChange={onQueryChange}
        onDebugChange={onDebugChange}
        inputRef={cqlInputRef}
      />
      <FilterButtons onInsertChip={handleInsertChip} />
    </div>
  );
};
