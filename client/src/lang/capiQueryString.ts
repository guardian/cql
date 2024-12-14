import { err, ok, Result } from "../utils/result";
import { CqlQuery, CqlBinary, CqlExpr } from "./ast";
import { getCqlFieldsFromCqlBinary } from "./utils";

class CapiCqlStringError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

export const queryStrFromQueryList = (
  query: CqlQuery
): Result<Error, string> => {
  const { content } = query;
  if (!content) {
    return ok("");
  }

  const searchStrs = strFromBinary(content);

  try {
    const otherQueries = getCqlFieldsFromCqlBinary(content).flatMap(
      (expr) => {
        switch (expr.type) {
          case "CqlField": {
            if (expr.value) {
              return [`${expr.key.literal ?? ""}=${expr.value.literal ?? ""}`];
            } else {
              throw new CapiCqlStringError(
                `The field '${expr.key.literal}' needs a value after it (e.g. '${expr.key.literal}:tone/news')`
              );
            }
          }
          default: {
            return [];
          }
        }
      }
    );

    const queryStr = searchStrs.length
      ? `q=${encodeURI(searchStrs.trim())}`
      : "";

    return ok([queryStr, otherQueries].filter(Boolean).flat().join("&"));
  } catch (e) {
    return err(e as Error);
  }
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
    default:
      // Ignore fields
      return;
  }
};

const strFromBinary = (queryBinary: CqlBinary): string => {
  const leftStr = strFromContent(queryBinary.left);

  const rightStr = queryBinary.right
    ? `${queryBinary.right.operator} ${strFromBinary(queryBinary.right.binary)}`
    : "";

  return (leftStr ?? "") + (rightStr ? ` ${rightStr.trim()} ` : "");
};
