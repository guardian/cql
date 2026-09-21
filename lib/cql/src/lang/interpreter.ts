import { CqlField, CqlLogicalAnd, CqlLogicalOr, CqlPrimary, CqlQuery, CqlUnary } from "./ast";
import { hasWhitespace, shouldQuoteFieldValue } from "./utils";

export const cqlQueryStrFromQueryAst = (query: CqlQuery): string => {
  const { content } = query;

  if (!content) {
    return "";
  }

  return strFromLogicalOr(content);
};

const strFromLogicalOr = (logicalOr: CqlLogicalOr): string => {
  const leftStr = strFromLogicalAnd(logicalOr.left);

  const rightStr = logicalOr.right
    ? ` ${strFromLogicalAnd(logicalOr.right)}`
    : "";

  return (leftStr ?? "") + (rightStr ? ` ${rightStr.trim()}` : "");
};

const strFromLogicalAnd = (logicalAnd: CqlLogicalAnd): string => {
  const leftStr = strFromUnary(logicalAnd.left);

  const rightStr = logicalAnd.right
    ? `AND ${strFromUnary(logicalAnd.right)}`
    : "";

  return (leftStr ?? "") + (rightStr ? ` ${rightStr.trim()}` : "");
}

const strFromUnary = (unary: CqlUnary): string => {
  const { primary, polarity } = unary;
  const polarityChar = polarity === "NEGATIVE" ? "-" : "";

  return `${polarityChar}${strFromPrimary(primary)}`
}

const strFromPrimary = (primary: CqlPrimary) => {
  switch (primary.type) {
    case "CqlStr":
      return hasWhitespace(primary.searchExpr)
        ? `"${primary.searchExpr}"`
        : primary.searchExpr;
    case "CqlGroup":
      return `(${strFromLogicalOr(primary.content).trim()})`;
    case "CqlField":
      return strFromField(primary);
  }
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
