import { createCqlInput } from "./cqlInput/CqlInput";
import applyDevTools from "prosemirror-dev-tools";
import "./style.css";
import { CqlService } from "./CqlService";

const debugEl = document.createElement("div");
debugEl.className = "Cql__Debug";
document.body.appendChild(debugEl);

const cqlService = new CqlService("http://localhost:5050");
const CqlInput = createCqlInput(cqlService, debugEl);

customElements.define("cql-input", CqlInput);

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <cql-input />
`;

if (window.CQL_VIEW) {
  applyDevTools(window.CQL_VIEW);
}
