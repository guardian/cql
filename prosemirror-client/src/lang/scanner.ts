import { Token, TokenType } from "./token";
import { isLetterOrDigit, isWhitespace } from "./util";

export class Scanner {
  private tokens: Array<Token> = [];
  private start = 0;
  private current = 0;
  private line = 1;

  constructor(private program: string) {}

  public scanTokens = (): Token[] => {
    while (!this.isAtEnd()) {
      // We are at the beginning of the next lexeme.
      this.start = this.current;
      this.scanToken();
    }

    return this.tokens.concat(
      new Token(TokenType.EOF, "", undefined, this.current, this.current)
    );
  };

  private scanToken = () => {
    switch (this.advance()) {
      case "+":
        this.addKey(TokenType.CHIP_KEY);
        return;
      case ":":
        this.addValue();
        return;
      case "(":
        this.addToken(TokenType.LEFT_BRACKET);
        return;
      case ")":
        this.addToken(TokenType.RIGHT_BRACKET);
        return;
      case " ":
        return;
      case "\r":
      case "\t":
      case '"':
        this.addString();
        return;
      default:
        this.addIdentifierOrUnquotedString();
        return;
    }
  };

  private addKey = (tokenType: TokenType) => {
    while (this.peek() != ":" && !isWhitespace(this.peek()) && !this.isAtEnd())
      this.advance();

    if (this.current - this.start === 1) this.addToken(tokenType);
    else {
      const key = this.program.substring(this.start + 1, this.current);

      this.addToken(tokenType, key);
    }
  };

  private addValue = () => {
    while (!isWhitespace(this.peek()) && !this.isAtEnd()) this.advance();

    if (this.current - this.start == 1) {
      this.addToken(TokenType.CHIP_VALUE);
    } else {
      const value = this.program.substring(this.start + 1, this.current);
      this.addToken(TokenType.CHIP_VALUE, value);
    }
  };

  private addIdentifierOrUnquotedString = () => {
    while (isLetterOrDigit(this.peek())) {
      this.advance();
    }

    const text = this.program.substring(this.start, this.current);
    const maybeReservedWord =
      Token.reservedWordMap[text as keyof typeof Token.reservedWordMap];

    return maybeReservedWord
      ? this.addToken(maybeReservedWord)
      : this.addUnquotedString();
  };

  private addUnquotedString = () => {
    while (
      // Consume whitespace up until the last whitespace char
      (!isWhitespace(this.peek()) ||
        isWhitespace(this.peek(1)) ||
        this.isAtEnd(1)) &&
      this.peek() != ")" &&
      !this.isAtEnd()
    ) {
      this.advance();
    }

    this.addToken(
      TokenType.STRING,
      this.program.substring(this.start, this.current)
    );
  };

  private addString = () => {
    while (this.peek() != '"' && !this.isAtEnd()) {
      this.advance();
    }

    if (this.isAtEnd()) {
      this.error(this.line, "Unterminated string at end of file");
    } else {
      this.advance();
    }

    this.addToken(
      TokenType.STRING,
      this.program.substring(this.start + 1, this.current - 1)
    );
  };

  private addToken = (tokenType: TokenType, literal?: string) => {
    const text = this.program.substring(this.start, this.current);
    this.tokens = this.tokens.concat(
      new Token(tokenType, text, literal, this.start, this.current - 1)
    );
  };

  private advance = () => {
    const previous = this.current;
    this.current = this.current + 1;
    return this.program[previous];
  };

  private peek = (offset: number = 0) =>
    this.program[this.current + offset] === undefined
      ? "\u0000"
      : this.program[this.current + offset];

  private isAtEnd = (offset: number = 0) =>
    this.current + offset === this.program.length;

  private error = (line: number, message: String) =>
    this.report(line, "", message);

  private report = (line: number, where: String, message: String) => {
    console.log(`[line ${line}] Error${where}: ${message}`);
  };
}
