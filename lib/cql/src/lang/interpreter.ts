import { CqlField, CqlBinary, CqlPrimary, CqlQuery, CqlUnary, CqlExpr } from "./ast";
import { hasWhitespace, shouldQuoteFieldValue } from "./utils";

export const cqlQueryStrFromQueryAst = (query: CqlQuery): string => {
  const { content } = query;

  if (!content) {
    return "";
  }

  return strFromExpr(content);
};

const strFromExpr = (expr: CqlExpr) => {
  switch(expr.type) {
    case "CqlBinary":
      return strFromBinary(expr);
    case "CqlUnary":
      return strFromUnary(expr);
    default:
      return strFromPrimary(expr);
  }
}

const strFromBinary = (logicalOr: CqlBinary): string => {
  const leftStr = strFromExpr(logicalOr.left);

  const rightStr = logicalOr.right
    ? `${logicalOr.right.operator.lexeme} ${strFromExpr(logicalOr.right.expr)}`
    : "";

  return (leftStr ?? "") + (rightStr ? ` ${rightStr.trim()}` : "");
};


const strFromUnary = (unary: CqlUnary): string => {
  const { primary, polarity } = unary;
  const polarityChar = polarity === "NEGATIVE" ? "-" : "";

  return `${polarityChar}${strFromPrimary(primary)}`
}

const strFromPrimary = (primary: CqlPrimary): string => {
  switch (primary.type) {
    case "CqlStr":
      return hasWhitespace(primary.searchExpr)
        ? `"${primary.searchExpr}"`
        : primary.searchExpr;
    case "CqlGroup":
      return `(${strFromExpr(primary.content).trim()})`;
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
