import { CqlBinary, CqlExpr, CqlField, CqlQuery } from "./ast";
import { escapeQuotes, hasWhitespace, shouldQuoteFieldValue } from "./utils";

export const cqlQueryStrFromQueryAst = (query: CqlQuery): string => {
  const { content } = query;

  if (!content) {
    return "";
  }

  return strFromBinary(content);
};

const strFromContent = (queryContent: CqlExpr): string | undefined => {
  const { content } = queryContent;
  switch (content.type) {
    case "CqlStr":
      return hasWhitespace(content.searchExpr)
        ? `"${content.searchExpr}"`
        : content.searchExpr;
    case "CqlGroup":
      return `(${strFromBinary(content.content).trim()})`;
    case "CqlBinary":
      return strFromBinary(content);
    case "CqlField":
      return strFromField(content);
  }
};

const strFromBinary = (queryBinary: CqlBinary): string => {
  const leftStr = strFromContent(queryBinary.left);

  const rightStr = queryBinary.right
    ? `${queryBinary.right.operator === "AND" ? "AND" : ""} ${strFromBinary(queryBinary.right.binary)}`
    : "";

  return (leftStr ?? "") + (rightStr ? ` ${rightStr.trim()}` : "");
};

const strFromField = (field: CqlField): string => {
  const polarity = field.key.tokenType === "CHIP_KEY_POSITIVE" ? "" : "-";
  const keyLiteral = field.key.literal ?? "";
  const normalisedKey = shouldQuoteFieldValue(keyLiteral)
    ? `"${keyLiteral}"`
    : keyLiteral;
  const valueLiteral = field.value?.literal ?? "";
  const normalisedValue = shouldQuoteFieldValue(valueLiteral)
    ? `"${valueLiteral}"`
    : valueLiteral;

  return `${polarity}${normalisedKey ?? ""}:${normalisedValue}`;
};
