import { isChipKey, Token } from "./token";
import {
  CqlQuery,
  CqlBinary,
  CqlExpr,
  CqlField,
  CqlGroup,
  CqlStr,
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
      this.peek().tokenType === TokenType.EOF ? undefined : this.binary();

    if (this.peek().tokenType !== TokenType.EOF) {
      throw this.unexpectedTokenError();
    }

    return new CqlQuery(content);
  }

  private binary(isNested: boolean = false): CqlBinary {
    if (this.peek().tokenType === TokenType.CHIP_VALUE)
      throw new ParseError(
        this.peek().start,
        "I found an unexpected `:`. Did you intend to search for a field, e.g. `tag:news`? If you would like to add a search phrase containing a `:` character, please surround it in double quotes.",
      );

    const left = this.expr();

    if (isNested) {
      this.guardAgainstCqlField("within a group");
    }
    const tokenType = this.peek().tokenType;

    switch (tokenType) {
      case TokenType.OR:
      case TokenType.AND: {
        this.consume(tokenType);
        this.guardAgainstCqlField(`after \`${tokenType}\`.`);
        if (this.isAtEnd()) {
          throw this.error(
            `There must be a query following \`${tokenType}\`, e.g. \`this ${tokenType} that\`.`,
          );
        }
        return new CqlBinary(left, {
          operator: tokenType,
          binary: this.binary(isNested),
        });
      }
      case TokenType.RIGHT_BRACKET:
      case TokenType.EOF: {
        return new CqlBinary(left);
      }
      default: {
        return new CqlBinary(left, {
          operator: TokenType.OR,
          binary: this.binary(isNested),
        });
      }
    }
  }

  private expr(): CqlExpr {
    const maybeNegation = this.safeConsume(TokenType.MINUS);
    const polarity =
      maybeNegation.kind === ResultKind.Ok ? "NEGATIVE" : "POSITIVE";
    const tokenType = this.peek().tokenType;

    switch (tokenType) {
      case TokenType.LEFT_BRACKET:
        return new CqlExpr(this.group(), polarity);
      case TokenType.STRING:
        return new CqlExpr(this.str(), polarity);
      case TokenType.CHIP_KEY: {
        return new CqlExpr(this.field(), polarity);
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

    const binary = this.binary(true);
    this.consume(
      TokenType.RIGHT_BRACKET,
      "Groups must end with a right bracket.",
    );

    return new CqlGroup(binary);
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
        `You cannot query for the field \`${queryFieldNode.key.literal}\` ${errorLocation}`,
      );
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
