import React, {useCallback, useEffect, useState} from "react";
import applyDevTools from "prosemirror-dev-tools";
import { createCqlInput } from "./cqlInput/CqlInput";
import { Typeahead, TypeaheadField } from "./lang/typeahead.ts";
import { toolsSuggestionOptionResolvers } from "./typeahead/tools-index/config";
import { CapiTypeaheadProvider } from "./lib.ts";
import { createParser } from "./lang/Cql.ts";
import { DebugChangeEventDetail } from "./types/dom";
import { Header } from "./components/Header";
import { HelpText } from "./components/HelpText";
import { ConfigPanel } from "./components/ConfigPanel";
import { SearchContainer } from "./components/SearchContainer";
import { DebugPanel } from "./components/DebugPanel";

type DataSource = "content-api" | "tools-index" | "content-api-simple-input";

const params = new URLSearchParams(window.location.search);
const initialEndpoint =
  params.get("endpoint") || "https://content.guardianapis.com";
const initialQuery = params.get("query") ?? "";

const typeaheadHelpersCapi = new CapiTypeaheadProvider(initialEndpoint, "test");
const capiTypeahead = new Typeahead(typeaheadHelpersCapi.typeaheadFields, {
  showTypeaheadForQueryStr: true,
  minCharsForQueryStrTypeahead: 2,
});

const CqlInputCapi = createCqlInput(capiTypeahead, {
  syntaxHighlighting: true,
  theme: { baseFontSize: "16px" },
  lang: { shortcuts: { "#": "tag" } },
  enableDebugEvents: true,
});

const guToolsTypeaheadFields: TypeaheadField[] = [
  new TypeaheadField(
    "team",
    "Team",
    "Search by team, e.g. capi",
    toolsSuggestionOptionResolvers,
  ),
];
const typeaheadGuTools = new Typeahead(guToolsTypeaheadFields);
const CqlInputGuTools = createCqlInput(typeaheadGuTools, {
  syntaxHighlighting: true,
  enableDebugEvents: true,
});

// Basic input implementation to demonstrate overlay method
class CqlInputSimple extends HTMLElement {
  public value = "";
  private overlay: HTMLDivElement | undefined;
  private input: HTMLTextAreaElement | undefined;

  connectedCallback() {
    const inputId = "cql-input-simple";
    const overlayId = "cql-input-simple-overlay";
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `
    <style>
      #cql-input-simple-container { position: relative; }
      #cql-input-simple {
        background-color: transparent;
        background-color: #333;
        outline: none;
        border: 2px solid #aaa;
        color: transparent;
        caret-color: white;
      }
      #cql-input-simple, #cql-input-simple-overlay {
        white-space: pre;
        padding: 5px;
        font-size: 16px;
        line-height: 24px;
        font-family: sans-serif;
        min-width: 200px;
        max-width: 300px;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      #cql-input-simple-overlay {
        position: absolute;
        top: 0; left: 0;
        color: white;
        border: 2px solid transparent;
        pointer-events: none;
        height: auto;
      }
      .CHIP_KEY_POSITIVE, .CHIP_KEY_NEGATIVE { color: #83c2ff; }
      .CHIP_VALUE { color: #c39eff; }
      .RIGHT_BRACKET, .LEFT_BRACKET { color: #ff57ff; }
      .STRING { color: beige; }
      .AND, .OR { color: pink; }
    </style>
    <div id="cql-input-simple-container">
      <textarea id="${inputId}"></textarea>
      <div id="${overlayId}">&nbsp;</div>
    </div>`;
    this.input = (shadow.getElementById(inputId) ?? undefined) as
      | HTMLTextAreaElement
      | undefined;
    this.overlay = (shadow.getElementById(overlayId) ?? undefined) as
      | HTMLDivElement
      | undefined;
    this.syncOverlayWithInput();
    this.input?.addEventListener("input", this.handleInput);
  }

  handleInput = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    const cql = createParser()(value);
    const tokenSpansHtml = cql.tokens.reduce(
      (acc, { tokenType, lexeme, start, end }, index, arr) => {
        const prevEnd = arr[index - 1]?.end ?? 0;
        const whitespaceCount = start - prevEnd - 1;
        if (tokenType === "EOF") return acc;
        return (
          acc +
          `<span> </span>`.repeat(Math.max(whitespaceCount, 0)) +
          `<span className="${tokenType}" data-prev-end=${prevEnd} data-start=${start} data-end=${end}>${lexeme ?? ""}</span>`
        );
      },
      "",
    );
    if (this.overlay) {
      this.overlay.innerHTML =
        tokenSpansHtml === "" ? "&nbsp;" : tokenSpansHtml;
    }
    this.syncOverlayWithInput();
  };

  syncOverlayWithInput = () => {
    const { width, height } = this.overlay?.getBoundingClientRect() || {};
    if (this.input) {
      this.input.style.height = `${height ?? ""}px`;
      this.input.style.width = `${width ?? ""}px`;
    }
  };
}

if (!customElements.get("cql-input-capi")) {
  customElements.define("cql-input-capi", CqlInputCapi);
}
if (!customElements.get("cql-input-gutools")) {
  customElements.define("cql-input-gutools", CqlInputGuTools);
}
if (!customElements.get("cql-input-simple-capi")) {
  customElements.define("cql-input-simple-capi", CqlInputSimple);
}

const setUrlParam = (key: string, value: string) => {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set(key, value);
  history.pushState(
    "",
    "",
    `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`,
  );
};

export const App = () => {
  const [dataSource, setDataSource] = useState<DataSource>("content-api");
  const [queryStr, setQueryStr] = useState(initialQuery);
  const [queryError, setQueryError] = useState<string | undefined>();
  const [debugInfo, setDebugInfo] = useState<DebugChangeEventDetail | null>(
    null,
  );
  const [endpoint, setEndpoint] = useState(initialEndpoint);

  const handleQueryChange = useCallback(
    (newQueryStr: string, error?: string) => {
      setQueryError(error);
      if (newQueryStr !== queryStr) {
        console.log("New str to handle", { newQueryStr });
        setQueryStr(newQueryStr);
        console.log({ newQueryStr });
        setUrlParam("query", newQueryStr);
      }
    },
    [queryStr],
  );

  const handleDebugChange = useCallback((detail: DebugChangeEventDetail) => {
    setDebugInfo(detail);
  }, []);

  const handleEndpointChange = useCallback((newEndpoint: string) => {
    setEndpoint(newEndpoint);
    setUrlParam("endpoint", newEndpoint);
    typeaheadHelpersCapi.setBaseUrl(newEndpoint);
  }, []);

  const handleDataSourceChange = useCallback((source: DataSource) => {
    setDataSource(source);
    setQueryStr("");
    setQueryError(undefined);
    setDebugInfo(null);
  }, []);

  // Apply ProseMirror dev tools
  useEffect(() => {
    if (window.CQL_VIEW) {
      applyDevTools(window.CQL_VIEW);
    }
  }, []);

  return (
    <div>
      <Header />
      <div className="Page__InputLayout">
        <div className="Page__InputContent">
          <SearchContainer
            dataSource={dataSource}
            value={queryStr}
            onQueryChange={handleQueryChange}
            onDebugChange={handleDebugChange}
          />
          <div id="error">{queryError}</div>
          <HelpText />
          <ConfigPanel
            dataSource={dataSource}
            onDataSourceChange={handleDataSourceChange}
            endpoint={endpoint}
            onEndpointChange={handleEndpointChange}
            value={queryStr}
            onValueChange={setQueryStr}
          />
        </div>
        <DebugPanel queryStr={queryStr} debugInfo={debugInfo} />
      </div>
    </div>
  );
};
