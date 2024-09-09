import { createCqlInput } from "./cqlInput/CqlInput";
import applyDevTools from "prosemirror-dev-tools";
import "./style.css";
import { CqlClientService } from "./services/CqlService";

const debugEl = document.createElement("div");
debugEl.className = "CqlSandbox__debug-container";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <h1>Rich query sandbox</h1>
  <cql-input id="cql-input" popover-container-id="popover-container"></cql-input>

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

const cqlInput = document.getElementById("cql-input")!;
const cqlEl = document.getElementById("cql")!;
const queryEl = document.getElementById("query")!;
cqlInput?.addEventListener("queryChange", ((e: CustomEvent) => {
  queryEl.innerHTML = e.detail.query;
  cqlEl.innerHTML = e.detail.cqlQuery;
}) as EventListener);

const params = new URLSearchParams(window.location.search);
const endpoint = params.get("endpoint");

const initialEndpoint = endpoint || "http://content.guardianapis.com";
const cqlService = new CqlClientService(initialEndpoint, "test");
const CqlInput = createCqlInput(cqlService, debugEl);

customElements.define("cql-input", CqlInput);

if (window.CQL_VIEW) {
  applyDevTools(window.CQL_VIEW);
}

const endpointInput = document.getElementById("endpoint") as HTMLInputElement;
endpointInput?.addEventListener("input", (event) => {
  const endpoint = (event.target as HTMLInputElement).value;
  setUrlParam("endpoint", endpoint);
  cqlService.setUrl(endpoint);
});
endpointInput.value = initialEndpoint;

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
