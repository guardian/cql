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

    return this.joinStringTokens(this.tokens).concat(
      new Token(TokenType.EOF, "", undefined, this.current, this.current)
    );
  };

  private joinStringTokens = (tokens: Array<Token>) =>
    tokens.reduce((acc, token) => {
      const prevToken = acc[acc.length - 1];
      if (
        prevToken?.tokenType === TokenType.STRING &&
        token.tokenType === TokenType.STRING
      ) {
        return acc
          .slice(0, acc.length - 1)
          .concat(
            new Token(
              TokenType.STRING,
              prevToken.lexeme + " " + token.lexeme,
              (prevToken.literal ?? "") + " " + (token.literal ?? ""),
              prevToken.start,
              token.end
            )
          );
      } else {
        return acc.concat(token);
      }
    }, [] as Token[]);

  private isAtEnd = () => this.current === this.program.length;

  private scanToken = () => {
    switch (this.advance()) {
      case "+":
        this.addKey(TokenType.QUERY_FIELD_KEY);
        return;
      case "@":
        this.addKey(TokenType.QUERY_OUTPUT_MODIFIER_KEY);
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
        return;
      case "\t":
        return;
      case "\n":
        this.line = this.line + 1;
        return;
      case '"':
        this.addString();
        return;
      default:
        if (this.isReservedWord()) {
          this.addIdentifier();
        } else {
          this.addUnquotedString();
        }
        return;
    }
  };

  private addKey = (tokenType: TokenType) => {
    while (this.peek() != ":" && !isWhitespace(this.peek()) && !this.isAtEnd())
      this.advance();

    if (this.current - this.start == 1) this.addToken(tokenType);
    else {
      const key = this.program.substring(this.start + 1, this.current);

      this.addToken(tokenType, key);
    }
  };

  private addValue = () => {
    while (!isWhitespace(this.peek()) && !this.isAtEnd()) this.advance();

    if (this.current - this.start == 1) {
      this.addToken(TokenType.QUERY_VALUE);
    } else {
      const value = this.program.substring(this.start + 1, this.current);
      this.addToken(TokenType.QUERY_VALUE, value);
    }
  };

  private isReservedWord = () => {
    return Object.keys(Token.reservedWords).some((reservedWord) =>
      this.program.substring(this.start).startsWith(reservedWord)
    );
  };

  private addIdentifier = () => {
    while (isLetterOrDigit(this.peek())) {
      this.advance();
    }

    const text = this.program.substring(this.start, this.current);
    const maybeReservedWord =
      Token.reservedWords[text as keyof typeof Token.reservedWords];

    return maybeReservedWord
      ? this.addToken(maybeReservedWord)
      : this.error(this.line, "Expected identifier");
  };

  private addUnquotedString = () => {
    while (
      !isWhitespace(this.peek()) &&
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

  private peek = () => (this.isAtEnd() ? "\u0000" : this.program[this.current]);

  private error = (line: number, message: String) =>
    this.report(line, "", message);

  private report = (line: number, where: String, message: String) => {
    console.log(`[line ${line}] Error${where}: ${message}`);
  };
}
