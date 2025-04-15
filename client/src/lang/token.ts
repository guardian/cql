export type TokenType = keyof typeof TokenType;

export const TokenType = {
  // Single-character tokens.
  LEFT_BRACKET: "LEFT_BRACKET",
  RIGHT_BRACKET: "RIGHT_BRACKET",

  // Literals.
  STRING: "STRING",
  CHIP_KEY_POSITIVE: "CHIP_KEY_POSITIVE",
  CHIP_KEY_NEGATIVE: "CHIP_KEY_NEGATIVE",
  CHIP_VALUE: "CHIP_VALUE",

  // Keywords.
  AND: "AND",
  OR: "OR",
  EOF: "EOF",
} as const;

export const isChipKey = (tokenType?: TokenType) =>
  tokenType &&
  (tokenType === TokenType.CHIP_KEY_POSITIVE ||
    tokenType === TokenType.CHIP_KEY_NEGATIVE);

export class Token {
  public static reservedWordMap = {
    AND: TokenType.AND,
    OR: TokenType.OR,
  } as const;

  public static reservedWordStrs = Object.keys(this.reservedWordMap);

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
