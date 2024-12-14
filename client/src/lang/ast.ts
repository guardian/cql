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
  left: QueryContent;
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

export type QueryContent = {
  type: "QueryContent";
  content: QueryStr | CqlBinary | QueryGroup | QueryField;
};

export const createQueryContent = (
  content: QueryContent["content"]
): QueryContent => ({
  type: "QueryContent",
  content,
});

export type QueryGroup = { type: "QueryGroup"; content: CqlBinary };

export const createQueryGroup = (
  content: QueryGroup["content"]
): QueryGroup => ({
  type: "QueryGroup",
  content,
});

export type QueryStr = { type: "QueryStr"; searchExpr: string; token: Token };

export const createQueryStr = (token: Token): QueryStr => ({
  type: "QueryStr",
  searchExpr: token.literal ?? "",
  token,
});

export type QueryField = { type: "QueryField"; key: Token; value?: Token };

export const createQueryField = (
  key: QueryField["key"],
  value: QueryField["value"]
): QueryField => ({
  type: "QueryField",
  key,
  value,
});
