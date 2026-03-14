import { h } from "preact";
import { CqlInputWrapper } from "./CqlInputWrapper";
import { FilterButtons } from "./FilterButtons";
import { DebugChangeEventDetail } from "../types/dom";
import { DataSource } from "./ConfigPanel";

interface SearchContainerProps {
  dataSource: DataSource;
  value: string;
  initialQuery: string;
  onQueryChange: (queryStr: string, error?: string) => void;
  onDebugChange: (detail: DebugChangeEventDetail) => void;
  inputRef: preact.RefObject<HTMLElement | null>;
}

export const SearchContainer = ({
  dataSource,
  value,
  initialQuery,
  onQueryChange,
  onDebugChange,
  inputRef,
}: SearchContainerProps) => {
  const handleInsertChip = (value: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (inputRef.current as any)?.insertChip?.(value);
  };

  return (
    <div class="cql-search-container">
      <CqlInputWrapper
        dataSource={dataSource}
        value={value}
        initialQuery={initialQuery}
        onQueryChange={onQueryChange}
        onDebugChange={onDebugChange}
        inputRef={inputRef}
      />
      <FilterButtons onInsertChip={handleInsertChip} />
    </div>
  );
};
