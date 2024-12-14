import { Token } from "./token";

export type CqlQuery = {
  type: "CqlQuery";
  content?: CqlBinary;
};

export const createQuery = (content?: CqlBinary): CqlQuery => ({
  type: "CqlQuery",
  content,
});

export type CqlBinary = {
  type: "CqlBinary";
  left: CqlExpr;
  right?: {
    operator: "OR" | "AND"
    binary: CqlBinary
  };
};

export const createCqlBinary = (
  left: CqlBinary["left"],
  right?: CqlBinary["right"]
): CqlBinary => ({
  type: "CqlBinary",
  left,
  right,
});

export type CqlExpr = {
  type: "QueryExpr";
  content: CqlStr | CqlBinary | CqlGroup | CqlField;
};

export const createCqlExpr = (
  content: CqlExpr["content"]
): CqlExpr => ({
  type: "QueryExpr",
  content,
});

export type CqlGroup = { type: "CqlGroup"; content: CqlBinary };

export const createCqlGroup = (
  content: CqlGroup["content"]
): CqlGroup => ({
  type: "CqlGroup",
  content,
});

export type CqlStr = { type: "CqlStr"; searchExpr: string; token: Token };

export const createCqlStr = (token: Token): CqlStr => ({
  type: "CqlStr",
  searchExpr: token.literal ?? "",
  token,
});

export type CqlField = { type: "CqlField"; key: Token; value?: Token };

export const createCqlField = (
  key: CqlField["key"],
  value: CqlField["value"]
): CqlField => ({
  type: "CqlField",
  key,
  value,
});
