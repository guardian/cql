enum TokenType {
  // Single-character tokens.
  PLUS,
  COLON,
  AT,
  LEFT_BRACKET,
  RIGHT_BRACKET,

  // Literals.
  STRING,
  NUMBER,
  QUERY_OUTPUT_MODIFIER_KEY,
  QUERY_FIELD_KEY,
  QUERY_VALUE,

  // Keywords.
  AND,
  OR,
  EOF,
}

export class Token {
  public static reservedWords = {
    AND: TokenType.AND,
    OR: TokenType.OR,
  };

  constructor(
    public tokenType: TokenType,
    public lexeme: string,
    public literal: string | undefined,
    public start: number,
    public end: number
  ) {}
  public toString() {
    return `${this.tokenType} ${this.lexeme} ${this.literal} ${this.start}-${this.end}`;
  }
}
