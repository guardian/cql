export type TokenType = keyof typeof TokenType;

export const TokenType = {
  // Single-character tokens.
  PLUS: "PLUS",
  COLON: "COLON",
  AT: "AT",
  LEFT_BRACKET: "LEFT_BRACKET",
  RIGHT_BRACKET: "RIGHT_BRACKET",

  // Literals.
  STRING: "STRING",
  NUMBER: "NUMBER",
  QUERY_OUTPUT_MODIFIER_KEY: "QUERY_OUTPUT_MODIFIER_KEY",
  QUERY_FIELD_KEY: "QUERY_FIELD_KEY",
  QUERY_VALUE: "QUERY_VALUE",

  // Keywords.
  AND: "AND",
  OR: "OR",
  EOF: "EOF",
} as const;

export class Token {
  public static reservedWords = {
    AND: TokenType.AND,
    OR: TokenType.OR,
  } as const;

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
