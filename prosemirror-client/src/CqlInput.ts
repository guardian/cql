import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, NodeSpec } from "prosemirror-model";

// Mix the nodes from prosemirror-schema-list into the basic schema to
// create a schema with list support.
const mySchema = new Schema({
  nodes: {
    /// NodeSpec The top level document node.
    doc: {
      content: "inline*",
    } as NodeSpec,
    text: {
      group: "inline"
    } as NodeSpec,
  },
});

export class CqlInput extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: "closed" });

    shadow.innerHTML = `<div id="cql-input"></div>`;
    const cqlInput = shadow.getElementById("cql-input")!;

    this.setupEditor(cqlInput);
  }

  setupEditor = (mountEl: HTMLElement) => {
    new EditorView(mountEl, {
      state: EditorState.create({
        doc: mySchema.nodes.doc.createAndFill()!,
        schema: mySchema
      }),
    });
  };
}
