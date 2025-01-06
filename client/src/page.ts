import { createCqlInput } from "./cqlInput/CqlInput";
import applyDevTools from "prosemirror-dev-tools";
import "./style.css";
import { CqlSuggestionService } from "./services/CqlSuggestionService.ts";
import { CapiTypeaheadHelpers } from "./typeahead/CapiTypeaheadHelpers.ts";
import { TypeaheadField } from "./lang/typeahead.ts";
import { toolsSuggestionOptionResolvers } from "./typeahead/tools-index/config";

const debugEl = document.createElement("div");
debugEl.className = "CqlSandbox__debug-container";

document.getElementById("cql-sandbox")!.appendChild(debugEl);

const dataSourceMap: Record<string, string> = {
  "content-api": "cql-input-capi",
  "tools-index": "cql-input-gutools",
};

const dataSourceSelect = document.getElementById("data-source")!;
const cqlInputContainer = document.getElementById("cql-input-container")!;
const cqlInput = document.getElementById("cql-input")!;
const cqlEl = document.getElementById("cql")!;
const queryEl = document.getElementById("query")!;
dataSourceSelect.addEventListener("change", (e: Event) => {
  const inputHtmlTagValue =
    dataSourceMap[(e.target as HTMLSelectElement).value];
  cqlInputContainer.innerHTML = `<${inputHtmlTagValue} initial-value="" id="cql-input" popover-container-id="popover-container"></${inputHtmlTagValue}>`;
});
cqlInput?.addEventListener("queryChange", ((e: CustomEvent) => {
  queryEl.innerHTML = e.detail.query;
  cqlEl.innerHTML = e.detail.cqlQuery.replaceAll(" ", "·");
}) as EventListener);

const params = new URLSearchParams(window.location.search);
const endpoint = params.get("endpoint");

const initialEndpointCapi = endpoint || "https://content.guardianapis.com";
const typeaheadHelpersCapi = new CapiTypeaheadHelpers(
  initialEndpointCapi,
  "test"
);
const suggestionServiceCapi = new CqlSuggestionService(
  typeaheadHelpersCapi.fieldResolvers
);

const CqlInputCapi = createCqlInput(suggestionServiceCapi, {
  debugEl,
  syntaxHighlighting: true,
});

const guToolsFieldResolvers: TypeaheadField[] = [
  new TypeaheadField(
    "team",
    "Team",
    "Search by team, e.g. capi",
    toolsSuggestionOptionResolvers
  ),
];

const suggestionServiceGuTools = new CqlSuggestionService(guToolsFieldResolvers);
const CqlInputGuTools = createCqlInput(suggestionServiceGuTools, {
  debugEl,
  syntaxHighlighting: true,
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

const setUrlParam = (key: string, value: string) => {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set(key, value);
  history.pushState(
    "",
    "",
    `${window.location.origin}${
      window.location.pathname
    }?${urlParams.toString()}`
  );
};

// Listen to URL changes and apply them to the URL
window.addEventListener("popstate", function () {
  const params = new URLSearchParams(window.location.search);
  const endpoint = params.get("endpoint");

  endpointInput.value = endpoint ?? "";
});
