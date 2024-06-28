import { createCqlInput } from "./cqlInput/CqlInput";
import applyDevTools from "prosemirror-dev-tools";
import "./style.css";
import { CqlService } from "./CqlService";

const debugEl = document.createElement("div");
debugEl.className = "CqlSandbox__debug-container";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <h1>Rich query sandbox</h1>
  <cql-input></cql-input>
  
  <div id="cql-sandbox" class="CqlSandbox">
    <h2>Config</h2>
    <div class="CqlSandbox__input-container">
      <input type="text" id="api-key" placeholder="Add a CAPI api key"/>
      <input type="text" id="endpoint" placeholder="Add a CQL language server endpoint"/>
    </div>
  </div>
`;

document.getElementById("cql-sandbox")!.appendChild(debugEl);

const params = new URLSearchParams(window.location.search);
const endpoint = params.get("endpoint");
const apiKey = params.get("api-key");

const initialEndpoint = endpoint || "http://localhost:5050";
const cqlService = new CqlService(initialEndpoint);
const CqlInput = createCqlInput(cqlService, debugEl);

customElements.define("cql-input", CqlInput);

if (window.CQL_VIEW) {
  applyDevTools(window.CQL_VIEW);
}

const apiKeyInput = document.getElementById("api-key") as HTMLInputElement;
apiKeyInput?.addEventListener("input", (event) => {
  setUrlParam("api-key", (event.target as HTMLInputElement).value);
});
apiKeyInput.value = apiKey ?? "";

const endpointInput = document.getElementById("endpoint") as HTMLInputElement;
endpointInput?.addEventListener("input", (event) => {
  const endpoint = (event.target as HTMLInputElement).value
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
    `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`
  );
};

// Listen to URL changes and apply them to the URL
window.addEventListener("popstate", function () {
  const params = new URLSearchParams(window.location.search);
  const endpoint = params.get("endpoint");
  const apiKey = params.get("api-key");

  apiKeyInput.value = apiKey ?? "";
  endpointInput.value = endpoint ?? "";
});
