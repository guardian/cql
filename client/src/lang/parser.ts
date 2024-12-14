import { Token } from "./token";
import {
  createQuery,
  createCqlBinary,
  createCqlExpr,
  createCqlField,
  createCqlGroup,
  createCqlStr,
  CqlQuery,
  CqlBinary,
  CqlExpr,
  CqlField,
  CqlGroup,
  CqlStr,
} from "./ast";
import { TokenType } from "./token";
import { either, err, ok, Result } from "../utils/result";

class ParseError extends Error {
  constructor(
    public position: number,
    public message: string
  ) {
    super(message);
  }
}

export class Parser {
  private current: number = 0;

  constructor(private tokens: Token[]) {}

  public parse(): Result<ParseError, CqlQuery> {
    try {
      return ok(this.query());
    } catch (e) {
      if (e instanceof ParseError) {
        return err(e);
      }
      throw e;
    }
  }

  private query(): CqlQuery {
    const content =
      this.peek().tokenType === TokenType.EOF ? undefined : this.queryBinary();

    if (this.peek().tokenType !== TokenType.EOF) {
      throw this.unexpectedTokenError();
    }

    return createQuery(content);
  }

  private queryBinary(isNested: boolean = false): CqlBinary {
    if (this.peek().tokenType === TokenType.CHIP_VALUE)
      throw new ParseError(
        this.peek().start,
        "I found an unexpected ':'. Did you intend to search for a tag, section or similar, e.g. tag:news? If you would like to add a search phrase containing a ':' character, please surround it in double quotes."
      );

    const left = this.queryContent();

    if (isNested) {
      this.guardAgainstCqlField("within a group");
    }

    switch (this.peek().tokenType) {
      case TokenType.AND: {
        this.consume(TokenType.AND);
        this.guardAgainstCqlField("after 'AND'.");
        if (this.isAtEnd()) {
          throw this.error(
            "There must be a query following 'AND', e.g. this AND that."
          );
        }
        return createCqlBinary(left, {
          operator: TokenType.AND,
          binary: this.queryBinary(isNested),
        });
      }
      case TokenType.OR: {
        this.consume(TokenType.OR);
        this.guardAgainstCqlField("after 'OR'.");
        if (this.isAtEnd()) {
          throw this.error(
            "There must be a query following 'OR', e.g. this OR that."
          );
        }
        return createCqlBinary(left, {
          operator: TokenType.OR,
          binary: this.queryBinary(isNested),
        });
      }
      case TokenType.RIGHT_BRACKET:
      case TokenType.EOF: {
        return createCqlBinary(left);
      }
      default: {
        return createCqlBinary(left, {
          operator: TokenType.OR,
          binary: this.queryBinary(isNested),
        });
      }
    }
  }

  private queryContent(): CqlExpr {
    switch (this.peek().tokenType) {
      case TokenType.LEFT_BRACKET:
        return createCqlExpr(this.queryGroup());
      case TokenType.STRING:
        return createCqlExpr(this.queryStr());
      default: {
        const { tokenType } = this.peek();
        if ([TokenType.AND, TokenType.OR].some((i) => i === tokenType)) {
          throw this.error(
            `An ${tokenType.toString()} keyword must have a search term before and after it, e.g. this ${tokenType.toString()} that.`
          );
        }

        switch (this.peek().tokenType) {
          case TokenType.CHIP_KEY: {
            return createCqlExpr(this.queryField());
          }
          default: {
            throw this.unexpectedTokenError();
          }
        }
      }
    }
  }

  private queryGroup(): CqlGroup {
    this.consume(
      TokenType.LEFT_BRACKET,
      "Groups should start with a left bracket"
    );

    if (this.isAtEnd() || this.peek().tokenType === TokenType.RIGHT_BRACKET) {
      throw this.error(
        "Groups can't be empty. Put a search term between the brackets!"
      );
    }

    this.guardAgainstCqlField(
      "within a group. Try putting this search term outside of the brackets!"
    );

    const binary = this.queryBinary(true);
    this.consume(
      TokenType.RIGHT_BRACKET,
      "Groups must end with a right bracket."
    );

    return createCqlGroup(binary);
  }

  private queryStr(): CqlStr {
    const token = this.consume(TokenType.STRING, "Expected a string");

    return createCqlStr(token);
  }

  private queryField(): CqlField {
    const key = this.consume(
      TokenType.CHIP_KEY,
      "Expected a search key, e.g. +tag"
    );

    const maybeValue = this.safeConsume(
      TokenType.CHIP_VALUE,
      "Expected a search value, e.g. +tag:new"
    );

    return either(maybeValue)(
      () => createCqlField(key, undefined),
      (value: Token) => createCqlField(key, value)
    );
  }

  /**
   * Throw a sensible parse error when a query field or output modifier is
   * found in the wrong place.
   */
  private guardAgainstCqlField = (errorLocation: string) => {
    switch (this.peek().tokenType) {
      case TokenType.CHIP_KEY: {
        const queryFieldNode = this.queryField();
        throw this.error(
          `You cannot query for the field “${queryFieldNode.key.literal}” ${errorLocation}`
        );
      }
      default:
        return;
    }
  };

  private check = (tokenType: TokenType) => {
    if (this.isAtEnd()) {
      return false;
    } else {
      return this.peek().tokenType == tokenType;
    }
  };

  private isAtEnd = () => this.peek()?.tokenType === TokenType.EOF;

  private peek = () => this.tokens[this.current];

  private advance = () => {
    if (!this.isAtEnd()) {
      const currentToken = this.tokens[this.current];
      this.current = this.current + 1;
      return currentToken;
    } else {
      return this.previous();
    }
  };

  private consume = (tokenType: TokenType, message: string = ""): Token => {
    if (this.check(tokenType)) {
      return this.advance();
    } else {
      throw this.error(message);
    }
  };

  private safeConsume = (
    tokenType: TokenType,
    message: string = ""
  ): Result<ParseError, Token> => {
    try {
      return ok(this.consume(tokenType, message));
    } catch (e) {
      if (e instanceof ParseError) {
        return err(e);
      }
      throw e;
    }
  };

  private previous = () => this.tokens[this.current - 1];

  private error = (message: string) =>
    new ParseError(this.peek().start, message);

  private unexpectedTokenError = () => {
    throw this.error(
      `I didn't expect to find a '${this.peek().lexeme}' ${!this.previous() ? "here." : `after '${this.previous()?.lexeme}'`}`
    );
  };
}
