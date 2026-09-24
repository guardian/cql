import { isChipKey, Token } from "./token";
import {
  CqlQuery,
  CqlBinary,
  CqlField,
  CqlGroup,
  CqlStr,
  CqlUnary,
  CqlPrimary,
  CqlExpr,
} from "./ast";
import { TokenType } from "./token";
import { either, err, ok, Result, ResultKind } from "../utils/result";

class ParseError extends Error {
  constructor(
    public position: number,
    public message: string,
  ) {
    super(message);
  }
}

export class Parser {
  private current: number = 0;

  constructor(private tokens: Token[]) { }

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
      this.peek().tokenType === TokenType.EOF ? undefined : this.logicalOr();

    if (this.peek().tokenType !== TokenType.EOF) {
      throw this.unexpectedTokenError();
    }

    return new CqlQuery(content);
  }

  private logicalOr(isNested: boolean = false): CqlBinary {
    if (isNested) {
      this.guardAgainstCqlField("within a group");
    }

    if (this.peek().tokenType === TokenType.CHIP_VALUE)
      throw new ParseError(
        this.peek().start,
        "I found an unexpected `:`. Did you intend to search for a field, e.g. `tag:news`? If you would like to add a search phrase containing a `:` character, please surround it in double quotes.",
      );

    let left = this.logicalAnd();

    let nextToken: Token | undefined = undefined;

    while (nextToken?.tokenType !== TokenType.EOF && nextToken?.tokenType !== TokenType.RIGHT_BRACKET) {
      nextToken = this.peek();
      if (isNested) {
        this.guardAgainstCqlField("within a group");
      }

      switch (nextToken.tokenType) {
        case TokenType.OR: {
          this.consume(nextToken.tokenType);
          this.guardAgainstCqlField(`after \`${nextToken.tokenType}\`.`);
          this.guardAgainstEof(nextToken);
          left = new CqlBinary(left,
            { operator: { tokenType: nextToken.tokenType, lexeme: nextToken.lexeme }, expr: this.logicalAnd() },
          );
          break;
        }
        case TokenType.EOF:
        case TokenType.RIGHT_BRACKET: {
          break;
        }
        // OR is implicit when two expressions are adjacent
        default: {
          left = new CqlBinary(left, {
            operator: { tokenType: TokenType.OR, lexeme: '' },
            expr: this.logicalAnd()
          });
          break;
        }
      }
    }

    return left.type !== "CqlBinary" ? new CqlBinary(left) : left;
  }

  private logicalAnd(): CqlExpr {
    let left = this.unary();

    let nextToken: Token | undefined = this.peek();

    while (nextToken?.tokenType === TokenType.AND) {
      this.consume(nextToken.tokenType);
      this.guardAgainstCqlField(`after \`${nextToken.tokenType}\`.`);
      this.guardAgainstEof(nextToken);
      left = new CqlBinary(left,
        { operator: { tokenType: nextToken.tokenType, lexeme: nextToken.lexeme }, expr: this.unary() }
      );

      nextToken = this.peek();
    }

    return left;
  }

  private unary(): CqlExpr {
    const maybeNegation = this.consumeMany([TokenType.MINUS, TokenType.PLUS]);
    const polarity =
      maybeNegation.kind === ResultKind.Ok &&
        maybeNegation.value.tokenType === TokenType.MINUS
        ? "NEGATIVE"
        : "POSITIVE";

    return new CqlUnary(this.primary(), polarity)
  }

  private primary(): CqlPrimary {
    const tokenType = this.peek().tokenType;

    switch (tokenType) {
      case TokenType.LEFT_BRACKET:
        return this.group();
      case TokenType.STRING:
        return this.str();
      case TokenType.CHIP_KEY: {
        return this.field();
      }
      case TokenType.AND:
      case TokenType.OR: {
        throw this.error(
          `An \`${tokenType.toString()}\` keyword must have a search term before and after it, e.g. \`this ${tokenType.toString()} that\`.`,
        );
      }
      default: {
        throw this.unexpectedTokenError();
      }
    }
  }

  private group(): CqlGroup {
    this.consume(
      TokenType.LEFT_BRACKET,
      "Groups should start with a left bracket",
    );

    if (this.isAtEnd() || this.peek().tokenType === TokenType.RIGHT_BRACKET) {
      throw this.error(
        "Groups can't be empty. Put a search term between the brackets!",
      );
    }

    this.guardAgainstCqlField(
      "within a group. Try putting this search term outside of the brackets!",
    );

    const content = this.logicalOr(true);
    this.consume(
      TokenType.RIGHT_BRACKET,
      "Groups must end with a right bracket.",
    );

    return new CqlGroup(content);
  }

  private str(): CqlStr {
    const token = this.consume(TokenType.STRING, "Expected a string");

    return new CqlStr(token);
  }

  private field(): CqlField {
    const key = this.consume(
      TokenType.CHIP_KEY,
      "Expected a search key, e.g. `+tag`",
    );

    const maybeValue = this.safeConsume(
      TokenType.CHIP_VALUE,
      "Expected a search value, e.g. `+tag:new`",
    );

    return either(maybeValue)(
      () => new CqlField(key, undefined),
      (value: Token) => new CqlField(key, value),
    );
  }

  /**
   * Throw a sensible parse error when a query field or output modifier is
   * found in the wrong place.
   */
  private guardAgainstCqlField = (errorLocation: string) => {
    if (isChipKey(this.peek().tokenType)) {
      const queryFieldNode = this.field();
      throw this.error(
        `You cannot query for the field \`${queryFieldNode.key.literal}\` ${errorLocation}. Try putting this search term outside of the brackets!`,
      );
    }
  };

  private guardAgainstEof = (previousToken: Token) => {
    if (this.isAtEnd()) {
      throw this.error(
        `I expected something else after \`${previousToken.lexeme}\``,
      );
    }
  }

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

  private consumeMany = (
    tokenTypes: TokenType[],
    message: string = "",
  ): Result<ParseError, Token> => {
    if (tokenTypes.some((tokenType) => this.check(tokenType))) {
      return ok(this.advance());
    } else {
      return err(this.error(message));
    }
  };

  private safeConsume = (
    tokenType: TokenType,
    message: string = "",
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
      `I didn't expect to find a \`${this.peek().lexeme}\` ${!this.previous() ? "here." : `after \`${this.previous()?.lexeme}\``}`,
    );
  };
}
