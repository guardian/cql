import { Token } from "./token";

export class CqlQuery {
  public readonly type = "CqlQuery";
  constructor(public readonly content?: CqlBinary) {}
}

export class CqlBinary {
  public readonly type = "CqlBinary";
  constructor(
    public readonly left: CqlExpr,
    public readonly right?: {
      operator: "OR" | "AND";
      binary: CqlBinary;
    },
  ) {}
}

export type POLARITY = "POSITIVE" | "NEGATIVE";

export class CqlExpr {
  public readonly type = "QueryExpr";
  constructor(
    public readonly content: CqlStr | CqlBinary | CqlGroup | CqlField,
    public readonly polarity: POLARITY = "POSITIVE",
  ) {}
}

export class CqlGroup {
  public readonly type = "CqlGroup";
  constructor(public readonly content: CqlBinary) {}
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
  ) {}
}
