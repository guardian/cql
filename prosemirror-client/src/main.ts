import { CqlInput } from "./CqlInput";
import "./style.css";

customElements.define("cql-input", CqlInput);

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <cql-input />
`;
