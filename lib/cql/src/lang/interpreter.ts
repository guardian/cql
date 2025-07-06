import { CqlBinary, CqlExpr, CqlField, CqlQuery } from "./ast";
import { hasWhitespace } from "./utils";

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
      return content.searchExpr;
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
  const literal = field.value?.literal ?? "";
  const normalisedLiteral = hasWhitespace(literal) ? `"${literal}"` : literal;

  return `${polarity}${field.key.literal ?? ""}:${normalisedLiteral}`;
};
