import React,  { RefObject, useEffect, useRef }  from "react";
import { DebugChangeEventDetail, QueryChangeEventDetail } from "../types/dom";

type DataSource = "content-api" | "tools-index" | "content-api-simple-input";

const dataSourceTagMap: Record<DataSource, string> = {
  "content-api": "cql-input-capi",
  "tools-index": "cql-input-gutools",
  "content-api-simple-input": "cql-input-simple-capi",
};

interface CqlInputWrapperProps {
  dataSource: DataSource;
  value: string;
  onQueryChange: (queryStr: string, error?: string) => void;
  onDebugChange: (detail: DebugChangeEventDetail) => void;
  inputRef: RefObject<HTMLElement | null>;
}

export const CqlInputWrapper = ({
  dataSource,
  value,
  onQueryChange,
  onDebugChange,
  inputRef,
}: CqlInputWrapperProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Create/replace the custom element when dataSource changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const tagName = dataSourceTagMap[dataSource];
    container.innerHTML = "";
    const el = document.createElement(tagName);
    el.setAttribute("autofocus", "true");
    el.id = "cql-input";

    if (value) {
      el.setAttribute("value", value);
    }

    container.appendChild(el);
    inputRef.current = el;

    const handleQueryChange = (e: Event) => {
      const detail = (e as CustomEvent<QueryChangeEventDetail>).detail;
      onQueryChange(detail.queryStr ?? "", detail.error);
    };

    const handleDebugChange = (e: Event) => {
      const detail = (e as CustomEvent<DebugChangeEventDetail>).detail;
      onDebugChange(detail);
    };

    el.addEventListener("queryChange", handleQueryChange);
    el.addEventListener("debugChange", handleDebugChange);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (el as any).focus?.();

    return () => {
      el.removeEventListener("queryChange", handleQueryChange);
      el.removeEventListener("debugChange", handleDebugChange);
    };
  }, [dataSource]);

  useEffect(() => {
    if (inputRef.current && value !== undefined) {
      inputRef.current.setAttribute("value", value);
    }
  }, [value]);

  return (
    <div id="cql-input-container" ref={containerRef} />
  );
};
