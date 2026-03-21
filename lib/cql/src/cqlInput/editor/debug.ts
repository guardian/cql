import { Node } from "prosemirror-model";
import { Mapping } from "prosemirror-transform";
import { Token } from "../../lang/token";
import {
  CqlQuery,
  CqlBinary,
  CqlExpr,
  CqlField,
  CqlGroup,
  CqlStr,
} from "../../lang/ast";
import { IS_READ_ONLY } from "./schema";
import { Selection } from "prosemirror-state";
import { toProseMirrorTokens } from "./utils";

// Debugging and visualisation utilities.

/**
 * Utility function to log node structure to console.
 */
export const logNode = (doc: Node) => {
  console.log(`Log node ${doc.type.name}:`);

  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    const indent = doc.resolve(pos).depth * 4;
    const content =
      node.type.name === "text" ? `'${node.textContent}'` : undefined;
    console.log(
      `${" ".repeat(indent)} ${node.type.name} ${node.attrs[IS_READ_ONLY] ? "(readonly)" : ""} ${pos}-${pos + node.nodeSize} ${
        content ? content : ""
      }`,
    );
  });
};

export const getDebugTokenHTML = (
  tokens: Token[],
  selection: Selection,
  mapping: Mapping,
) => {
  let html = `
    <div className="CqlDebug__queryDiagram CqlDebug__queryDiagramToken">
      <div className="CqlDebug__queryDiagramLabel">
        <div>Lexeme</div>
        <div>Literal</div>
      </div>
      <div className="CqlDebug__queryDiagramContent">`;

  const invertedMapping = mapping.invert();
  const mappedFrom = invertedMapping.map(selection.from);
  const mappedTo = invertedMapping.map(selection.to);

  const pmTokens = toProseMirrorTokens(tokens);

  pmTokens.forEach((token, index) => {
    html += `${Array(Math.max(1, token.lexeme.length))
      .fill(undefined)
      .map((_, index) => {
        const lexemeChar = token.lexeme[index];
        const literalOffset = token.lexeme.indexOf(
          token.literal?.slice(0, 1) ?? "",
        );

        const literalChar = token.literal?.[index - literalOffset];
        const globalIndex = token.from + index;
        return `
        <div className="CqlDebug__queryBox">
          <div className="CqlDebug__queryIndex">${globalIndex}</div>
          ${
            mappedFrom === globalIndex
              ? `<div className="CqlDebug__selection">^</div>`
              : ""
          }
          ${
            mappedTo === globalIndex
              ? `<div className="CqlDebug__selection">$</div>`
              : ""
          }
          ${
            lexemeChar !== undefined
              ? `<div className="CqlDebug__queryChar">${lexemeChar}</div>`
              : ""
          }
              ${
                literalChar !== undefined
                  ? `<div className="CqlDebug__queryChar CqlDebug__queryCharAlt">${literalChar}</div>`
                  : ""
              }
          ${
            index === 0
              ? `<div className="CqlDebug__tokenLabel">${token.tokenType}</div>`
              : ""
          }
        </div>`;
      })
      .join("")}
      ${
        pmTokens[index + 1]?.from > token.to && token.tokenType !== "EOF"
          ? `<div className="CqlDebug__queryBox"><div className="CqlDebug__queryIndex">${
              token.to
            }</div>${
              mappedFrom === token.to
                ? `<div className="CqlDebug__selection">^</div>`
                : ""
            }${
              mappedTo === token.to
                ? `<div className="CqlDebug__selection">$</div>`
                : ""
            }</div>`
          : ""
      }`;
  });
  html += "</div></div>";

  return html;
};

export const getOriginalQueryHTML = (query: string) => `
  <div className="CqlDebug__queryDiagram">
    <div className="CqlDebug__queryDiagramContent">
    ${query
      .split("")
      .map(
        (char, index) => `
            <div className="CqlDebug__queryBox">
                <div className="CqlDebug__queryIndex">${index}</div>
                <div className="CqlDebug__queryChar">${char}</div>
            </div>`,
      )
      .join("")}
      </div>
  </div>`;

export const getDebugMappingHTML = (
  query: string,
  mapping: Mapping,
  doc: Node,
) => {
  const queryPosMap: Record<string, { char: string; originalPos: number }[]> =
    {};
  query.split("").forEach((char, index) => {
    const mappedPos = mapping.map(index);
    const posInfo = { char, originalPos: index };
    queryPosMap[mappedPos] = queryPosMap[mappedPos]
      ? queryPosMap[mappedPos].concat(posInfo)
      : [posInfo];
  });

  let nodeDiagram = `
    <div className="CqlDebug__queryDiagram CqlDebug__queryDiagramNode">
    <div className="CqlDebug__queryDiagramLabel">
        <div>Mapped query</div>
        <div>Node text</div>
      </div>
      <div className="CqlDebug__nodeDiagram">`;
  const posMap: Record<string, { char?: string; node?: string }> = {};
  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    const content =
      node.type.name === "text" ? `${node.textContent}` : undefined;
    const { name } = node.type;

    posMap[pos] = {
      node: posMap[pos]?.node?.length
        ? `${posMap[pos].node ?? ""}, ${name}`
        : name,
    };

    posMap[pos + node.nodeSize] = posMap[pos + node.nodeSize]?.node
      ? { node: `${posMap[pos + node.nodeSize].node} ${name} end` }
      : { node: `${name} end` };

    if (!content) {
      posMap[pos + 1] = {};
    }

    content
      ?.split("")
      .forEach(
        (char, index) =>
          (posMap[index + pos + 1] = posMap[index + pos + 1]
            ? { char, ...posMap[index + pos + 1] }
            : { char }),
      );
  });

  nodeDiagram += Object.entries(posMap)
    .map(
      ([pos, { char, node }]) =>
        `
                <div className="CqlDebug__queryBox CqlDebug__queryBox--offset" data-pos="${pos}">
                    <div className="CqlDebug__queryIndex">${pos}</div>
                    ${(queryPosMap[pos] ?? [])
                      .map(
                        ({ char }) =>
                          `<div className="CqlDebug__originalChar">${char}</div>`,
                      )
                      .join(" ")}


                    ${
                      char?.length === 1
                        ? `<div className="CqlDebug__nodeChar">${char}</div>`
                        : ""
                    }
                    ${
                      node?.length
                        ? `<div className="CqlDebug__nodeLabel ${
                            node === "text" ? "CqlDebug__textNode" : ""
                          }">${node}</div>`
                        : ""
                    }
                </div>`,
    )
    .join("");

  nodeDiagram += `</div></div>`;

  return nodeDiagram;
};

export const getDebugASTHTML = (query: CqlQuery) => {
  return `<div className="tree--container">
    <ul className="tree">
      <li>
        <span>${getNodeHTML(query)}</span>
        ${query.content ? getBinaryHTML(query.content) : ""}
      </li>
    </ul>
  </div>`;
};

const getContentHTML = (query: CqlExpr) => {
  const html = (() => {
    switch (query.content.type) {
      case "CqlBinary":
        return getBinaryHTML(query.content);
      case "CqlField":
        return getFieldHTML(query.content);
      case "CqlGroup":
        return getGroupHTML(query.content);
      case "CqlStr":
        return getStrHTML(query.content);
    }
  })();

  return `
    <ul>
      <li>
        <span>${getNodeHTML(query)}<span className="node-content">${query.polarity}</span></span>

        ${html}
      </li>
    </ul>`;
};

const getBinaryHTML = (query: CqlBinary): string => {
  const maybeBinary = query.right?.binary;

  const binaryContent = maybeBinary
    ? `
     <ul>
        <li>${getContentHTML(query.left)}</li>
        <li>${getBinaryHTML(maybeBinary)}</li>
      </ul>`
    : getContentHTML(query.left);

  return `
    <ul className="tree">
      <li>
        <span>${getNodeHTML(query)}</span>
        ${binaryContent}
      </li>
    </ul>
  `;
};

const getFieldHTML = (field: CqlField) => {
  return `
    <ul>
      <li>
        <span>${getNodeHTML(field)}</span>
        <ul>
          <li>${getTokenHTML(field.key)}</li>
          ${field.value ? `<li>${getTokenHTML(field.value)}</li>` : ""}
        </ul>
    </ul>
  `;
};

const getTokenHTML = (token: Token) => {
  return `
    <span>${token.tokenType}
    <span className="node-content">${token.literal}</span>
      <span className="node-pos">${token.start}‑${token.end}</span>
    </span>
  `;
};

const getGroupHTML = (group: CqlGroup) => {
  return `
    <ul>
      <li>
        ${getNodeHTML(group)}
        ${getBinaryHTML(group.content)}
      </li>
    </ul>
  `;
};

const getStrHTML = (str: CqlStr) => {
  return `
    <ul>
      <li>
        <span>
          ${getNodeHTML(str)}
          <span className="node-content">${str.searchExpr}</span>
          <span className="node-pos">${str.token.start}‑${str.token.end}</span>
        </span>
      </li>
    </ul>
  `;
};

const getNodeHTML = (node: { type: string }) =>
  `<span className="node-description">${node.type}</span>`;
