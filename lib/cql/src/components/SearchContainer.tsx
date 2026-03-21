import React , {useRef} from "react";
import { CqlInputWrapper } from "./CqlInputWrapper";
import { FilterButtons } from "./FilterButtons";
import { DebugChangeEventDetail } from "../types/dom";
import { DataSource } from "./ConfigPanel";
import { Debounce } from "../cqlInput/popover/components/Debounce";

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
    <div className="cql-search-container">
      <Debounce
        // Debouncing ensures we do not attempt to update the component's value while another
        // update is in flight within React.
        throttleInMs={1}
        component={CqlInputWrapper}
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
