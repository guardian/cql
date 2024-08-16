import { QueryBinary, QueryContent, QueryList } from "./ast";

class CapiQueryStringError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

export const build = (program: QueryList): string => {
  const searchStrs = program.exprs.flatMap((expr) => {
    switch (expr.type) {
      case "QueryBinary":
        return [strFromBinary(expr)];
      default:
        return [];
    }
  });

  const otherQueries = program.exprs.flatMap((expr) => {
    switch (expr.type) {
      case "QueryField":
        if (expr.value) {
          return [`${expr.key.literal ?? ""}=${expr.value.literal ?? ""}`];
        } else {
          throw new CapiQueryStringError(
            `The field '+$${expr.key}' needs a value after it (e.g. +${expr.key}:tone/news)`
          );
        }
    }
  });

  const maybeSearchStr = searchStrs.length
    ? `q=${encodeURI(searchStrs.join(" "))}`
    : "";

  return [maybeSearchStr, otherQueries].flat().join("&");
};

const strFromContent = (queryContent: QueryContent) => {
  const { content } = queryContent;
  switch (content.type) {
    case "QueryStr":
      return content.searchExpr;
    case "QueryGroup":
      return `(${strFromBinary(content)})`;
    case "QueryBinary":
      return strFromBinary(content);
  }
};

const strFromBinary = (queryBinary: QueryBinary) => {
  const leftStr = strFromContent(queryBinary.left);
  const rightStr = queryBinary.right
    ? ` ${queryBinary.right[0].tokenType.toString} ${strFromBinary(
        queryBinary.right[1].content
      )}`
    : "";
  return leftStr + rightStr;
};
