import { createCqlInput } from "./cqlInput/CqlInput";
import applyDevTools from "prosemirror-dev-tools";
import "./style.css";
import { CqlClientService } from "./services/CqlService";
import { TypeaheadHelpersCapi } from "./typeahead/typeaheadHelpersCapi";
import { TypeaheadField } from "./lang/typeahead.ts";
import { toolsSuggestionOptionResolvers } from "./typeahead/tools-index/config";

const debugEl = document.createElement("div");
debugEl.className = "CqlSandbox__debug-container";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="Page__header">
    <h1>Rich query sandbox</h1>
    <a class="Page__repo-link" href="https://github.com/guardian/cql" target="_blank">
      Repo&nbsp;
      <svg width="20" height="18" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" fill="#eee"/>
      </svg>
    </a>
  </div>
  <div>
    <label for="data-source">Search:</label>
    <select id="data-source">
      <option value="content-api">Content API</option>
      <option value="tools-index">Tools Index</option>
    </select>
  </div>
  <div id="cql-input-container">
    <cql-input-capi initial-value="" id="cql-input" popover-container-id="popover-container"></cql-input-capi>
  </div>
  <p>Press <tt>+</tt> to select a specific field to search.</p>
  <p>Join search terms with <tt class="CqlToken__AND">OR</tt> and <tt class="CqlToken__AND">AND</tt>. Consecutive search terms, e.g. <tt class="CqlToken__STRING">this that</tt>, are implicitly joined with <tt class="CqlToken__OR">OR</tt>.</p>
  <p>Group expressions with parenthesis, e.g. <tt class="CqlToken__STRING">one <tt class="CqlToken__LEFT_BRACKET">(</tt>two <tt class="CqlToken__AND">AND</tt> three<tt class="CqlToken__RIGHT_BRACKET">)</tt></tt>
  <div id="cql-sandbox" class="CqlSandbox">
    <div class="CqlSandbox__query-results">
      <div>
        <h2>CQL</h2>
        <div id="cql"></div>
      </div>
      <div>
        <h2>API query</h2>
        <div id="query"></div>
      </div>
    </div>
    <h2>Config</h2>
    <div class="CqlSandbox__input-container">
      <input type="text" id="endpoint" placeholder="Add a CQL language server endpoint"/>
    </div>
    <div class="CqlSandbox__popover-container" id="popover-container"></div>
  </div>
`;

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
const typeaheadHelpersCapi = new TypeaheadHelpersCapi(
  initialEndpointCapi,
  "test"
);
const cqlServiceCapi = new CqlClientService(
  typeaheadHelpersCapi.fieldResolvers
);
const CqlInputCapi = createCqlInput(cqlServiceCapi, {
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
const cqlServiceGuTools = new CqlClientService(guToolsFieldResolvers);
const CqlInputGuTools = createCqlInput(cqlServiceGuTools, {
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
