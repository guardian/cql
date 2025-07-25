import applyDevTools from "prosemirror-dev-tools";
import { createCqlInput } from "./cqlInput/CqlInput";
import {
  getDebugASTHTML,
  getDebugMappingHTML,
  getDebugTokenHTML,
  getOriginalQueryHTML,
} from "./cqlInput/editor/debug.ts";
import { createParser } from "./lang/Cql.ts";
import { Typeahead, TypeaheadField } from "./lang/typeahead.ts";
import { CapiTypeaheadProvider } from "./typeahead/CapiTypeaheadHelpers.ts";
import { toolsSuggestionOptionResolvers } from "./typeahead/tools-index/config";
import { DebugChangeEventDetail, QueryChangeEventDetail } from "./types/dom";

const setUrlParam = (key: string, value: string) => {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set(key, value);
  history.pushState(
    "",
    "",
    `${window.location.origin}${
      window.location.pathname
    }?${urlParams.toString()}`,
  );
};

const debugEl = document.createElement("div");
debugEl.className = "CqlSandbox__debug-container";

document.getElementById("cql-sandbox")!.appendChild(debugEl);

const debugMappingContainer = document.createElement("div");
debugMappingContainer.classList.add("CqlDebug__mapping");
debugEl.appendChild(debugMappingContainer);
const jsonDebugContainer = document.createElement("div");
jsonDebugContainer.classList.add("CqlDebug__json");
debugEl.appendChild(jsonDebugContainer);
const debugTokenContainer = document.createElement("div");
jsonDebugContainer.appendChild(debugTokenContainer);
const debugASTContainer = document.createElement("div");
jsonDebugContainer.appendChild(debugASTContainer);
const debugSuggestionsContainer = document.createElement("div");
jsonDebugContainer.appendChild(debugSuggestionsContainer);
const debugErrorContainer = document.createElement("div");
jsonDebugContainer.appendChild(debugErrorContainer);

const handleDebugChangeEvent = (e: CustomEvent<DebugChangeEventDetail>) => {
  const {
    detail: { queryStr, queryAst, tokens, doc, error, mapping },
  } = e;
  debugASTContainer.innerHTML = `<h2>AST</h2><div>${JSON.stringify(
    queryAst,
    undefined,
    "  ",
  )}</div>`;

  debugTokenContainer.innerHTML = `<h2>Tokens</h2><div>${JSON.stringify(
    tokens,
    undefined,
    "  ",
  )}</div>`;

  debugMappingContainer.innerHTML = `
            <p>Original query: </p>
            ${getOriginalQueryHTML(queryStr)}
            <p>Tokenises to:</p>
            ${getDebugTokenHTML(tokens)}
            ${
              queryAst
                ? `<p>AST: </p>
            ${getDebugASTHTML(queryAst)}`
                : ""
            }
            <p>Maps to nodes: </p>
            ${getDebugMappingHTML(queryStr, mapping, doc)}
          `;

  debugErrorContainer.innerHTML = error
    ? `
        <h2>Error</h2>
        <div>Position: ${error.position ?? "No position given"}</div>
        <div>Message: ${error.message}</div>
      `
    : "";
};

const dataSourceMap: Record<string, string> = {
  "content-api": "cql-input-capi",
  "tools-index": "cql-input-gutools",
  "content-api-simple-input": "cql-input-simple-capi",
};

const dataSourceSelect = document.getElementById("data-source")!;
const cqlInputContainer = document.getElementById("cql-input-container")!;
const cqlInput = document.getElementById("cql-input")!;
cqlInput.setAttribute(
  "value",
  new URLSearchParams(window.location.search).get("query") ?? "",
);

const cqlEl = document.getElementById("cql")!;
const queryEl = document.getElementById("query")!;
const errorEl = document.getElementById("error")!;

function handleQueryChange(queryStr: string, errorMessage?: string) {
  setUrlParam("query", queryStr);
  queryEl.innerHTML = queryStr;
  cqlEl.innerHTML = queryStr.replaceAll(" ", "·");
  errorEl.innerHTML = errorMessage ?? "";
}

function handleQueryChangeEvent(e: CustomEvent<QueryChangeEventDetail>) {
  handleQueryChange(e.detail.queryStr ?? "", e.detail.error);
}

dataSourceSelect.addEventListener("change", (e: Event) => {
  const source = (e.target as HTMLSelectElement).value;
  const inputHtmlTagValue = dataSourceMap[source];
  cqlInputContainer.innerHTML = `<${inputHtmlTagValue} autofocus id="${source}"></${inputHtmlTagValue}>`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no type for webcomponent, yet
  const newCqlInput = cqlInputContainer.firstChild as any;
  newCqlInput?.focus();
  handleQueryChange("");
  newCqlInput?.addEventListener("queryChange", handleQueryChangeEvent);
  newCqlInput?.addEventListener("debugChange", handleDebugChangeEvent);
});
cqlInput?.addEventListener("queryChange", handleQueryChangeEvent);
cqlInput?.addEventListener("debugChange", handleDebugChangeEvent);

const params = new URLSearchParams(window.location.search);
const endpoint = params.get("endpoint");

const initialEndpointCapi = endpoint || "https://content.guardianapis.com";
const typeaheadHelpersCapi = new CapiTypeaheadProvider(
  initialEndpointCapi,
  "test",
);
const capiTypeahead = new Typeahead(typeaheadHelpersCapi.typeaheadFields);

const CqlInputCapi = createCqlInput(capiTypeahead, {
  syntaxHighlighting: true,
  theme: {
    baseFontSize: "16px",
  },
  lang: {
    shortcuts: {
      "#": "tag",
    },
  },
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

customElements.define("cql-input-gutools", CqlInputGuTools);
customElements.define("cql-input-capi", CqlInputCapi);

if (window.CQL_VIEW) {
  applyDevTools(window.CQL_VIEW);
}

const endpointInput = document.getElementById("endpoint") as HTMLInputElement;
endpointInput?.addEventListener("input", (event) => {
  const endpoint = (event.target as HTMLInputElement).value;
  setUrlParam("endpoint", endpoint);
  typeaheadHelpersCapi.setBaseUrl(endpoint);
});
endpointInput.value = initialEndpointCapi;

// Listen to URL changes and apply them to the URL
window.addEventListener("popstate", function () {
  const params = new URLSearchParams(window.location.search);
  const endpoint = params.get("endpoint");

  endpointInput.value = endpoint ?? "";
});

const programmaticInput = document.getElementById("programmatic-input");
programmaticInput?.addEventListener("input", (e) => {
  cqlInput.setAttribute("value", (e.target as HTMLInputElement).value ?? "");
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
      #cql-input-simple-container {
        position: relative;
      }
      #cql-input-simple {
        background-color: transparent;
        background-color: #333;
        outline: none;
        border: 2px solid #aaa;
        color: transparent;
        caret-color: white;
      }
      #cql-input-simple,
      #cql-input-simple-overlay {
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
        top: 0;
        left: 0;
        color: white;
        border: 2px solid transparent;
        pointer-events: none;
        height: auto;
      }
      .CHIP_KEY_POSITIVE,
      .CHIP_KEY_NEGATIVE {
        color: #83c2ff;
      }
      .CHIP_VALUE {
        color: #c39eff;
      }
      .RIGHT_BRACKET, .LEFT_BRACKET {
        color: #ff57ff;
      }
      .STRING {
        color: beige;
      }
      .AND, .OR {
        color: pink;
      }
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

        if (tokenType === "EOF") {
          return acc;
        }

        return (
          acc +
          `<span> </span>`.repeat(Math.max(whitespaceCount, 0)) +
          `<span class="${tokenType}" data-prev-end=${prevEnd} data-start=${start} data-end=${end}>${lexeme ?? ""}</span>`
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

customElements.define("cql-input-simple-capi", CqlInputSimple);
