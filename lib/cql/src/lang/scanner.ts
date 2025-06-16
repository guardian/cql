import { mergeDeep } from "../utils/merge";
import { Token, TokenType } from "./token";
import { hasLetterOrDigit, hasWhitespace } from "./utils";

export type ScannerSettings = {
  groups: boolean;
  operators: boolean;
};

const defaultScannerSettings: ScannerSettings = {
  groups: true,
  operators: true,
};

export class Scanner {
  private tokens: Array<Token> = [];
  private start = 0;
  private current = 0;
  private line = 1;
  private settings: Partial<ScannerSettings>;

  constructor(
    private program: string,
    settings: Partial<ScannerSettings> = {},
  ) {
    this.settings = mergeDeep(defaultScannerSettings, settings);
  }

  public scanTokens = (): Token[] => {
    while (!this.isAtEnd()) {
      // We are at the beginning of the next lexeme.
      this.start = this.current;
      this.scanToken();
    }

    return this.tokens.concat(
      new Token(TokenType.EOF, "", undefined, this.current, this.current),
    );
  };

  private scanToken = () => {
    switch (this.advance()) {
      case "+":
        this.addKey(TokenType.CHIP_KEY_POSITIVE);
        return;
      case "-":
        this.addKey(TokenType.CHIP_KEY_NEGATIVE);
        return;
      case ":":
        this.addValue();
        return;
      case "(":
        if (this.settings.groups) {
          this.addToken(TokenType.LEFT_BRACKET);
        } else {
          this.addIdentifierOrUnquotedString();
        }
        return;
      case ")":
        if (this.settings.groups) {
          this.addToken(TokenType.RIGHT_BRACKET);
        } else {
          this.addIdentifierOrUnquotedString();
        }
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
    while (
      this.peek() != ":" &&
      !hasWhitespace(this.peek()) &&
      !this.isAtEnd()
    ) {
      this.advance();
    }

    if (this.current - this.start === 1) {
      this.addToken(tokenType);
    } else {
      const key = this.program.substring(this.start + 1, this.current);

      this.addToken(tokenType, key);
    }
  };

  private addValue = () => {
    if (this.peek() === '"') {
      this.advance();
      this.consumeQuotedRange();
      const literal = this.program.substring(this.start + 2, this.current - 1);
      this.addToken(TokenType.CHIP_VALUE, literal === "" ? undefined : literal);
      return;
    }

    while (!hasWhitespace(this.peek()) && !this.isAtEnd()) this.advance();

    if (this.current - this.start === 1) {
      // No content - add an empty token
      this.addToken(TokenType.CHIP_VALUE);
    } else {
      const value = this.program.substring(this.start + 1, this.current);
      this.addToken(TokenType.CHIP_VALUE, value);
    }
  };

  private addIdentifierOrUnquotedString = () => {
    while (hasLetterOrDigit(this.peek())) {
      this.advance();
    }

    const text = this.program.substring(this.start, this.current);
    const maybeReservedWord =
      Token.reservedWordMap[text as keyof typeof Token.reservedWordMap];

    return maybeReservedWord && this.settings.operators
      ? this.addToken(maybeReservedWord)
      : this.addUnquotedString();
  };

  private addUnquotedString = () => {
    while (
      // Consume whitespace up until the last whitespace char
      (!hasWhitespace(this.peek()) ||
        hasWhitespace(this.peek(1)) ||
        this.isAtEnd(1)) &&
      this.peek() != ")" &&
      !this.isAtEnd()
    ) {
      this.advance();
    }

    this.addToken(
      TokenType.STRING,
      this.program.substring(this.start, this.current),
    );
  };

  private addString = () => {
    this.consumeQuotedRange();

    this.addToken(
      TokenType.STRING,
      this.program.substring(this.start + 1, this.current - 1),
    );
  };

  /**
   * Consumes a quoted range.
   */
  private consumeQuotedRange = () => {
    while (this.peek() != '"' && !this.isAtEnd()) {
      this.advance();
    }

    if (this.isAtEnd()) {
      this.error(
        this.line,
        'I expected to encounter a closing double-quote (") before the query ended',
      );
    } else {
      this.advance();
    }
  };

  private addToken = (tokenType: TokenType, literal?: string) => {
    const text = this.program.substring(this.start, this.current);
    this.tokens = this.tokens.concat(
      new Token(tokenType, text, literal, this.start, this.current - 1),
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

  private error = (line: number, message: string) =>
    this.report(line, "", message);

  private report = (line: number, where: string, message: string) => {
    console.log(`[line ${line}] Error${where}: ${message}`);
  };
}
