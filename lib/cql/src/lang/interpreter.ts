import { CqlBinary, CqlExpr, CqlField, CqlQuery } from "./ast";
import { hasWhitespace, shouldQuoteFieldValue } from "./utils";

export const cqlQueryStrFromQueryAst = (query: CqlQuery): string => {
  const { content } = query;

  if (!content) {
    return "";
  }

  return strFromBinary(content);
};

const strFromExpr = (queryExpr: CqlExpr): string | undefined => {
  const { content, polarity } = queryExpr;
  const polarityChar = polarity === "NEGATIVE" ? "-" : "";
  const renderedContent = (() => {
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
  })();

  return `${polarityChar}${renderedContent}`;
};

const strFromBinary = (queryBinary: CqlBinary): string => {
  const leftStr = strFromExpr(queryBinary.left);

  const rightStr = queryBinary.right
    ? `${queryBinary.right.operator === "AND" ? "AND" : ""} ${strFromBinary(queryBinary.right.binary)}`
    : "";

  return (leftStr ?? "") + (rightStr ? ` ${rightStr.trim()}` : "");
};

const strFromField = (field: CqlField): string => {
  const keyLiteral = field.key.literal ?? "";
  const normalisedKey = shouldQuoteFieldValue(keyLiteral)
    ? `"${keyLiteral}"`
    : keyLiteral;
  const valueLiteral = field.value?.literal ?? "";
  const normalisedValue = shouldQuoteFieldValue(valueLiteral)
    ? `"${valueLiteral}"`
    : valueLiteral;

  return `${normalisedKey ?? ""}:${normalisedValue}`;
};
