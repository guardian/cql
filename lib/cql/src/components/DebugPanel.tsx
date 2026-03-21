import React from "react";
import {
  getDebugASTHTML,
  getDebugMappingHTML,
  getDebugTokenHTML,
  getOriginalQueryHTML,
} from "../cqlInput/editor/debug.ts";
import { DebugChangeEventDetail } from "../types/dom";

interface DebugPanelProps {
  queryStr: string;
  debugInfo: DebugChangeEventDetail | null;
}

export const DebugPanel = ({
  queryStr,
  debugInfo,
}: DebugPanelProps) => {
  const cqlDisplay = queryStr.replaceAll(" ", "·");

  let mappingHTML = "";
  let tokensHTML = "";
  let astJSON = "";
  let errorHTML = "";

  if (debugInfo) {
    const { tokens, queryAst, selection, mapping, doc, error } = debugInfo;

    tokensHTML = `<h2>Tokens</h2><div>${JSON.stringify(tokens, undefined, "  ")}</div>`;
    astJSON = `<h2>AST</h2><div>${JSON.stringify(queryAst, undefined, "  ")}</div>`;

    mappingHTML = `
      <p>Original query: </p>
      ${getOriginalQueryHTML(debugInfo.queryStr)}
      <p>Tokenises to (ProseMirror positions):</p>
      ${getDebugTokenHTML(tokens, selection, mapping)}
      ${queryAst ? `<p>AST: </p>${getDebugASTHTML(queryAst)}` : ""}
      <p>Maps to nodes: </p>
      ${getDebugMappingHTML(debugInfo.queryStr, mapping, doc)}
    `;

    if (error) {
      errorHTML = `
        <h2>Error</h2>
        <div>Position: ${error.position ?? "No position given"}</div>
        <div>Message: ${error.message}</div>
      `;
    }
  }

  return (
    <div id="cql-sandbox" className="Page__InputDebug CqlSandbox">
      <div className="CqlSandbox__query-results">
        <div>
          <h2>CQL</h2>
          <div id="cql">{cqlDisplay}</div>
        </div>
        <div>
          <h2>API query</h2>
          <div id="query">{queryStr}</div>
        </div>
      </div>
      <div className="CqlSandbox__debug-container">
        <div
          className="CqlDebug__mapping"
          dangerouslySetInnerHTML={{ __html: mappingHTML }}
        />
        <div className="CqlDebug__json">
          <div dangerouslySetInnerHTML={{ __html: tokensHTML }} />
          <div dangerouslySetInnerHTML={{ __html: astJSON }} />
          <div dangerouslySetInnerHTML={{ __html: errorHTML }} />
        </div>
      </div>
    </div>
  );
};
