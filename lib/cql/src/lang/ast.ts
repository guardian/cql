import { Token } from "./token";

const CQL_QUERY = "CqlQuery"
export class CqlQuery {
  public readonly type = CQL_QUERY;
  constructor(public readonly content?: CqlBinary) {}
}

const CQL_BINARY = "CqlBinary"
export class CqlBinary {
  public readonly type = CQL_BINARY;
  constructor(
    public readonly left: CqlExpr,
    public readonly right?: {
      operator: "OR" | "AND";
      binary: CqlBinary;
    },
  ) {}
}


const CQL_EXPR = "QueryExpr";
export class CqlExpr {
  public readonly type = CQL_EXPR;
  constructor(
    public readonly content: CqlStr | CqlBinary | CqlGroup | CqlField,
  ) {}
}

const CQL_GROUP = "CqlGroup";
export class CqlGroup {
  public readonly type = CQL_GROUP;
  constructor(public readonly content: CqlBinary) {}
}

const CQL_STR = "CqlStr";
export class CqlStr {
  public readonly type = CQL_STR;
  public readonly searchExpr: string;
  constructor(readonly token: Token) {
    this.searchExpr = token.literal ?? "";
  }
}

const CQL_FIELD = "CqlField";

export class CqlField {
  public readonly type = CQL_FIELD;
  constructor(
    public readonly key: Token,
    public readonly value?: Token,
  ) {}
}

export type CqlType =
  | typeof CQL_QUERY
  | typeof CQL_BINARY
  | typeof CQL_EXPR
  | typeof CQL_GROUP
  | typeof CQL_STR
  | typeof CQL_FIELD

export type CqlTypeMap = {
  [CQL_QUERY]: CqlQuery,
  [CQL_BINARY]: CqlBinary,
  [CQL_EXPR]: CqlExpr,
  [CQL_GROUP]: CqlGroup,
  [CQL_STR]: CqlStr,
  [CQL_FIELD]: CqlField,
}
