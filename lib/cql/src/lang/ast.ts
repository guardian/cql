import { Token } from "./token";

export class CqlQuery {
  public readonly type = "CqlQuery";
  constructor(public readonly content?: CqlExpr) { }
}

export type CqlExpr = CqlBinary | CqlUnary | CqlGroup | CqlPrimary;

export class CqlBinary {
  public readonly type = "CqlLogicalOr";
  constructor(
    public readonly left: CqlExpr,
    public readonly right?: CqlExpr
  ) { }
}

// No need for a class, as a primary is a simple union
export type CqlPrimary = CqlGroup | CqlStr | CqlField

export class CqlUnary {
  public readonly type = "CqlUnary"
  constructor(
    public readonly primary: CqlPrimary,
    public readonly polarity: POLARITY = 'POSITIVE'
  ) { }
}

export type POLARITY = "POSITIVE" | "NEGATIVE";

export class CqlGroup {
  public readonly type = "CqlGroup";
  constructor(public readonly content: CqlExpr) { }
}

export class CqlStr {
  public readonly type = "CqlStr";
  public readonly searchExpr: string;
  constructor(readonly token: Token) {
    this.searchExpr = token.literal ?? "";
  }
}

export class CqlField {
  public readonly type = "CqlField";
  constructor(
    public readonly key: Token,
    public readonly value?: Token,
  ) { }
}
