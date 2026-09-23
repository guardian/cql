import { err, ok, Result } from "../utils/result";
import { CqlLogicalAnd, CqlBinary, CqlPrimary, CqlQuery, CqlUnary } from "./ast";
import { getCqlFieldsFromCqlBinary } from "./utils";

class CapiCqlStringError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

const dateFields = ["from-date", "to-date"];
const relativeDateRegex = /(?<polarity>[-+])(?<quantity>\d+)(?<unit>[dmyw])/;

const add = (a: number, b: number) => a + b;
const substract = (a: number, b: number) => a - b;

const parseDateValue = (value: string): string => {
  const result = relativeDateRegex.exec(value);
  if (!result) {
    return value;
  }
  const now = new Date();
  const { polarity, quantity, unit } = result.groups as {
    polarity: string;
    quantity: string;
    unit: string;
  };

  const op = polarity === "+" ? add : substract;

  const year = op(now.getFullYear(), unit === "y" ? parseInt(quantity) : 0);
  // Months are zero indexed in Javascript, ha ha ha
  const month = op(now.getMonth(), unit === "m" ? parseInt(quantity) : 0);
  const day = op(
    now.getDate(),
    unit === "d"
      ? parseInt(quantity)
      : unit === "w"
        ? parseInt(quantity) * 7
        : 0,
  );
  const date = new Date(year, month, day);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
};

export const queryStrFromQuery = (
  query: CqlQuery,
): Result<Error, string> => {
  const { content } = query;
  if (!content) {
    return ok("");
  }

  const searchStrs = strFromLogicalOr(content);

  try {
    const otherQueries = getCqlFieldsFromCqlBinary(content).flatMap((expr) => {
      switch (expr.type) {
        case "CqlField": {
          if (expr.value?.literal) {
            const value = dateFields.includes(expr.key.literal ?? "")
              ? parseDateValue(expr.value?.literal ?? "")
              : expr.value.literal;
            return [`${expr.key.literal ?? ""}=${value}`];
          } else {
            throw new CapiCqlStringError(
              `The field '${expr.key.literal}' needs a value after it (e.g. '${expr.key.literal}:tone/news')`,
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

const strFromUnary = (unary: CqlUnary): string => {
  return `${unary.polarity === "NEGATIVE" ? "-" : ""}${strFromPrimary(unary.primary)}`
}

const strFromPrimary = (primary: CqlPrimary): string => {
  switch (primary.type) {
    case "CqlStr":
      return primary.searchExpr;
    case "CqlGroup":
      return `(${strFromLogicalOr(primary.content).trim()})`;
    case "CqlField":
      // Fields are accumulated at the top of the tree
      return "";
  }
};

const strFromLogicalOr = (logicalOr: CqlBinary): string => {
  const leftStr = strFromLogicalAnd(logicalOr.left);

  const rightStr = logicalOr.right ? strFromLogicalAnd(logicalOr.right) : ""

  return (leftStr ?? "") + (rightStr ? ` ${rightStr.trim()} ` : "");
};


const strFromLogicalAnd = (logicalAnd: CqlLogicalAnd): string => {
  const leftStr = strFromUnary(logicalAnd.left);

  const rightStr = logicalAnd.right ? strFromUnary(logicalAnd.right) : ""

  return (leftStr ?? "") + (rightStr ? `AND ${rightStr.trim()} ` : "");
}