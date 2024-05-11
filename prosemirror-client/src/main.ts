import { createCqlInput } from "./CqlInput";
import applyDevTools from "prosemirror-dev-tools";
import "./style.css";
import { CqlService } from "./CqlService";

const cqlService = new CqlService("http://localhost:5050");
const CqlInput = createCqlInput(cqlService);

customElements.define("cql-input", CqlInput);

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <cql-input />
`;

applyDevTools(window.CQL_VIEW);
