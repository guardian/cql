import { mergeDeep } from "../utils/merge";
import { Token, TokenType } from "./token";
import { hasReservedChar, hasWhitespace } from "./utils";

export type ScannerSettings = {
  groups: boolean;
  operators: boolean;
  shortcuts: Record<string, string>;
};

const defaultScannerSettings: ScannerSettings = {
  groups: true,
  operators: true,
  shortcuts: {},
};

export class Scanner {
  private tokens: Array<Token> = [];
  private start = 0;
  private current = 0;
  private line = 1;
  private settings: ScannerSettings;

  constructor(
    private program: string,
    settings: Partial<ScannerSettings> = {},
  ) {
    this.settings = mergeDeep(defaultScannerSettings, settings);

    Object.keys(this.settings.shortcuts).forEach((shortcut) => {
      if (hasReservedChar(shortcut)) {
        throw new Error(
          `The character '${shortcut}' is reserved, and cannot be used as a shortcut`,
        );
      }
      if (shortcut.length > 1) {
        throw new Error(
          `The shortcut '${shortcut}' is too long: shortcuts can only be a single character`,
        );
      }
    });
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
          this.handleUnquotedString();
        }
        return;
      case ")":
        if (this.settings.groups) {
          this.addToken(TokenType.RIGHT_BRACKET);
        } else {
          this.handleUnquotedString();
        }
        return;
      case " ":
        return;
      case "\r":
      case "\t":
      case '"':
        this.handleQuotedString();
        return;
      default: {
        const current = this.peek(-1);
        if (this.settings.shortcuts[current]) {
          this.addShortcut(this.settings.shortcuts[current]);
          return;
        } else {
          this.handleUnquotedString();
        }
        return;
      }
    }
  };

  private addKey = (tokenType: TokenType) => {
    const isQuotedKey = this.peek() === '"';
    if (isQuotedKey) {
      this.advance();
      this.consumeQuotedRange();
      const literal = this.program.substring(this.start + 2, this.current - 1);
      this.addToken(tokenType, literal === "" ? undefined : literal);
      return;
    }

    while (
      this.peek() !== ":" &&
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

  private addShortcut = (shortcut: string) => {
    this.addToken(TokenType.CHIP_KEY_POSITIVE, shortcut);
    if (!this.isAtEnd() && !hasWhitespace(this.peek())) {
      this.advance();
      this.addValue();
    }
  };

  /**
   * Unquoted chars could be a reserved word, a field key (if followed by ':'),
   * or an unquoted string.
   */
  private handleUnquotedString = () => {
    while (!hasReservedChar(this.peek()) && !this.isAtEnd()) {
      this.advance();
    }

    const text = this.program.substring(this.start, this.current);
    const maybeReservedWord =
      Token.reservedWordMap[text as keyof typeof Token.reservedWordMap];

    if (maybeReservedWord && this.settings.operators) {
      return this.addToken(maybeReservedWord);
    }

    if (this.peek() === ":") {
      return this.addToken(TokenType.CHIP_KEY_POSITIVE, text);
    }

    this.addUnquotedString();
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

  private handleQuotedString = () => {
    this.consumeQuotedRange();

    const literal = this.program.substring(this.start + 1, this.current - 1);

    if (this.peek() === ":") {
      return this.addToken(TokenType.CHIP_KEY_POSITIVE, literal);
    }

    this.addToken(TokenType.STRING, literal);
  };

  /**
   * Consumes a quoted range.
   */
  private consumeQuotedRange = () => {
    while (this.peek() !== '"' && !this.isAtEnd()) {
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
    const lexeme = this.program.substring(this.start, this.current);
    this.tokens = this.tokens.concat(
      new Token(tokenType, lexeme, literal, this.start, this.current - 1),
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
