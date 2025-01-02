import { err, ok, Result } from "../utils/result";
import { CqlQuery, CqlBinary, CqlExpr } from "./ast";
import { getCqlFieldsFromCqlBinary } from "./utils";

class CapiCqlStringError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

const dateFields = ["from-date", "to-date"];
const relativeDateRegex = /-(?<quantity>\d+)(?<unit>[dmyw])/;

const parseDateValue = (value: string): string => {
  const result = relativeDateRegex.exec(value);
  if (!result) {
    return value;
  }
  const now = new Date();
  const { quantity, unit } = result.groups as {
    quantity: string;
    unit: string;
  };

  const year = now.getFullYear() - (unit === "y" ? parseInt(quantity) : 0);
  // Months are zero indexed in Javascript, ha ha ha
  const month = now.getMonth() - (unit === "m" ? parseInt(quantity) : 0);
  const day =
    now.getDate() -
    (unit === "d"
      ? parseInt(quantity)
      : unit === "w"
        ? parseInt(quantity) * 7
        : 0);
  const date = new Date(year, month, day);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
};

export const queryStrFromQueryList = (
  query: CqlQuery
): Result<Error, string> => {
  const { content } = query;
  if (!content) {
    return ok("");
  }

  const searchStrs = strFromBinary(content);

  try {
    const otherQueries = getCqlFieldsFromCqlBinary(content).flatMap((expr) => {
      switch (expr.type) {
        case "CqlField": {
          if (expr.value) {
            const value = dateFields.includes(expr.key.literal ?? "")
              ? parseDateValue(expr.value?.literal ?? "")
              : expr.value.literal;
            return [`${expr.key.literal ?? ""}=${value}`];
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
    });

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

  const rightStr =
    queryBinary.right &&
    // Something of a hack — don't include
    queryBinary.right.binary.left.content.type !== "CqlField"
      ? `${queryBinary.right.operator} ${strFromBinary(queryBinary.right.binary)}`
      : "";

  return (leftStr ?? "") + (rightStr ? ` ${rightStr.trim()} ` : "");
};
