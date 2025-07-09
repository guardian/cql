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

export const getDebugTokenHTML = (tokens: Token[]) => {
  let html = `
    <div class="CqlDebug__queryDiagram CqlDebug__queryDiagramToken">
      <div class="CqlDebug__queryDiagramLabel">
        <div>Lexeme</div>
        <div>Literal</div>
      </div>
      <div class="CqlDebug__queryDiagramContent">`;
  tokens.forEach((token, index) => {
    html += `${Array(Math.max(1, token.lexeme.length))
      .fill(undefined)
      .map((_, index) => {
        const lexemeChar = token.lexeme[index];
        const literalOffset = token.lexeme.indexOf(
          token.literal?.slice(0, 1) ?? "",
        );

        const literalChar = token.literal?.[index - literalOffset];
        return `
        <div class="CqlDebug__queryBox">
          <div class="CqlDebug__queryIndex">${token.start + index}</div>
          ${
            lexemeChar !== undefined
              ? `<div class="CqlDebug__queryChar">${lexemeChar}</div>`
              : ""
          }
              ${
                literalChar !== undefined
                  ? `<div class="CqlDebug__queryChar CqlDebug__queryCharAlt">${literalChar}</div>`
                  : ""
              }
          ${
            index === 0
              ? `<div class="CqlDebug__tokenLabel">${token.tokenType}</div>`
              : ""
          }
        </div>`;
      })
      .join("")}
      ${
        tokens[index + 1]?.start > token.end + 1 &&
        tokens[index + 1]?.tokenType !== "EOF" &&
        token.tokenType !== "EOF"
          ? `<div class="CqlDebug__queryBox"><div class="CqlDebug__queryIndex">${
              token.end + 1
            }</div></div>`
          : ""
      }`;
  });
  html += "</div></div>";

  return html;
};

export const getOriginalQueryHTML = (query: string) => `
  <div class="CqlDebug__queryDiagram">
    <div class="CqlDebug__queryDiagramContent">
    ${query
      .split("")
      .map(
        (char, index) => `
            <div class="CqlDebug__queryBox">
                <div class="CqlDebug__queryIndex">${index}</div>
                <div class="CqlDebug__queryChar">${char}</div>
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
    <div class="CqlDebug__queryDiagram CqlDebug__queryDiagramNode">
    <div class="CqlDebug__queryDiagramLabel">
        <div>Mapped query</div>
        <div>Node text</div>
      </div>
      <div class="CqlDebug__nodeDiagram">`;
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
                <div class="CqlDebug__queryBox CqlDebug__queryBox--offset" data-pos="${pos}">
                    <div class="CqlDebug__queryIndex">${pos}</div>
                    ${(queryPosMap[pos] ?? []).map(
                      ({ char }) =>
                        `<div class="CqlDebug__originalChar">${char}</div>`,
                    )}


                    ${
                      char?.length === 1
                        ? `<div class="CqlDebug__nodeChar">${char}</div>`
                        : ""
                    }
                    ${
                      node?.length
                        ? `<div class="CqlDebug__nodeLabel ${
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
  return `<div class="tree--container">
    <ul class="tree">
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
        <span>${getNodeHTML(query)}</span>
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
    <ul class="tree">
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
    <span class="node-content">${token.literal}</span>
      <span class="node-pos">${token.start}‑${token.end}</span>
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
          <span class="node-content">${str.searchExpr}</span>
          <span class="node-pos">${str.token.start}‑${str.token.end}</span>
        </span>
      </li>
    </ul>
  `;
};

const getNodeHTML = (node: { type: string }) =>
  `<span class="node-description">${node.type}</span>`;
