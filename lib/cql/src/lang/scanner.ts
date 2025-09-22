import { mergeDeep } from "../utils/merge";
import { Token, TokenType } from "./token";
import { hasReservedChar, hasWhitespace, unescapeQuotes } from "./utils";

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
  private currentIndex = 0;
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
      this.start = this.currentIndex;
      this.scanToken();
    }

    return this.tokens.concat(
      new Token(
        TokenType.EOF,
        "",
        undefined,
        this.currentIndex,
        this.currentIndex,
      ),
    );
  };

  private scanToken = () => {
    switch (this.advance()) {
      case "+":
        this.addToken(TokenType.PLUS, "+");
        return;
      case "-":
        this.addToken(TokenType.MINUS, "-");
        return;
      case ":":
        this.addChipValue();
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
        const current = this.current();
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

  /**
   * Unquoted chars could be a reserved word, a field key (if followed by ':'),
   * or an unquoted string.
   */
  private handleUnquotedString = () => {
    while (
      !(hasReservedChar(this.peek()) && !this.peekIsEscaped()) &&
      !hasWhitespace(this.peek()) &&
      !this.isAtEnd()
    ) {
      this.advance();
    }

    const literal = this.program.substring(this.start, this.currentIndex);
    const maybeReservedWord =
      Token.reservedWordMap[literal as keyof typeof Token.reservedWordMap];

    if (maybeReservedWord && this.settings.operators) {
      return this.addToken(maybeReservedWord);
    }

    if (this.peek() === ":") {
      return this.addToken(TokenType.CHIP_KEY, literal);
    }

    while (
      // Consume whitespace up until the last whitespace char
      (!hasWhitespace(this.peek()) ||
        hasWhitespace(this.peek(1)) ||
        this.isAtEnd(1)) &&
      this.peek() !== ")" &&
      !this.isAtEnd()
    ) {
      this.advance();
    }

    this.addToken(
      TokenType.STRING,
      this.program.substring(this.start, this.currentIndex),
    );
  };

  private addChipValue = () => {
    if (this.peek() === '"') {
      this.advance();
      const literal = this.consumeQuotedRange(1);
      this.addToken(TokenType.CHIP_VALUE, literal === "" ? undefined : literal);
      return;
    }

    while (!hasWhitespace(this.peek()) && !this.isAtEnd()) this.advance();

    if (this.currentIndex - this.start === 1) {
      // No content - add an empty token
      this.addToken(TokenType.CHIP_VALUE);
    } else {
      const value = unescapeQuotes(
        this.program.substring(this.start + 1, this.currentIndex),
      );
      this.addToken(TokenType.CHIP_VALUE, value);
    }
  };

  private addShortcut = (shortcut: string) => {
    this.addToken(TokenType.CHIP_KEY, shortcut);
    if (!this.isAtEnd() && !hasWhitespace(this.peek())) {
      this.advance();
      this.addChipValue();
    }
  };

  private handleQuotedString = () => {
    const literal = this.consumeQuotedRange();

    if (this.peek() === ":") {
      return this.addToken(TokenType.CHIP_KEY, literal);
    }

    this.addToken(TokenType.STRING, literal);
  };

  /**
   * Consumes a quoted range, returning the literal value it encloses.
   */
  private consumeQuotedRange = (offset = 0) => {
    while ((this.peek() !== '"' || this.peek(-1) === "\\") && !this.isAtEnd()) {
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

    return this.program.substring(
      this.start + 1 + offset,
      this.currentIndex - 1,
    );
  };

  private addToken = (tokenType: TokenType, literal?: string) => {
    const lexeme = this.program.substring(this.start, this.currentIndex);
    const token = new Token(
      tokenType,
      lexeme,
      literal,
      this.start,
      this.currentIndex - 1,
    );
    this.tokens = this.tokens.concat(token);
  };

  private advance = () => {
    const previous = this.currentIndex;
    this.currentIndex = this.currentIndex + 1;
    return this.program[previous];
  };

  private peekIsEscaped = (offset: number = 0) =>
    this.peek(offset - 1) === "\\";

  private current = () => this.peek(-1);

  private peek = (offset: number = 0) =>
    this.program[this.currentIndex + offset] === undefined
      ? "\u0000"
      : this.program[this.currentIndex + offset];

  private isAtEnd = (offset: number = 0) =>
    this.currentIndex + offset === this.program.length;

  private error = (line: number, message: string) =>
    this.report(line, "", message);

  private report = (line: number, where: string, message: string) => {
    console.log(`[line ${line}] Error${where}: ${message}`);
  };
}
