import { Injectable } from '@nestjs/common';
import { ExecutionError } from '../errors/errors';
import { ExecutionEnvironment } from '../interpreter/Interpreter';
import { Tokenizer } from './Tokenizer';

interface AstNodeBase {
  type: string;
  evaluate: (env: ExecutionEnvironment, ...args: any[]) => any;
}

export interface AstNode extends AstNodeBase {
  [key: string]: any;
}

export interface AstNodeOperation extends AstNodeBase {
  operator: string;
  arguments: AstNode[];
}

/**
 * Custom Parser for Workflow Expressions
 */
@Injectable()
export class Parser {
  private _string = '';
  private _tokenizer: Tokenizer;
  private _lookahead: any;

  constructor() {
    this._tokenizer = new Tokenizer();
  }

  /**
   * Parse recursively starting from the main
   * entry point, the Expression:
   * @param string
   */
  parse(string: string) {
    this._string = string;
    this._tokenizer.init(string);

    // Prime the tokenizer to obtain the first token
    // which is our lookahead. The lookahead is used for predictive parsing
    this._lookahead = this._tokenizer.getNextToken();

    return this.Expression();
  }

  /**
   * Main entry point.
   *
   * Expression
   *    : BinaryExpression
   *    ;
   *
   */
  Expression(): AstNode {
    return this.BinaryExpression();
  }

  /**
   * BinaryExpression
   *    : UnaryExpression
   *    | EqualityOperation
   */
  BinaryExpression() {
    const left = this.UnaryExpression();
    switch (this._lookahead?.type) {
      case 'EQUALITY_OPERATOR':
        return this.EqualityOperation(left);
      case null:
        return left;
      case undefined:
        return left;
    }
    throw new SyntaxError(
      `Unexpected token "${this._lookahead?.type}" in string: "${this._string}"`,
    );
  }

  /**
   * UnaryExpression
   *    : LeftHandSideExpression
   *    ;
   */
  UnaryExpression() {
    return this.LeftHandSideExpression();
  }

  /**
   * LeftHandSideExpression
   *    : CallMemberExpression
   *    ;
   *
   */
  LeftHandSideExpression() {
    return this.CallMemberExpression();
  }
  /**
   * CallMemberExpression
   *    : MemberExpression
   *    | CallExpression
   *    ;
   */
  CallMemberExpression() {
    const member = this.MemberExpression();

    if (this._lookahead?.type === '(') {
      return this.CallExpression(member);
    }

    return member;
  }

  /**
   * Generic CallExpression
   *
   * CallExpression
   *    : Callee Arguments
   *
   * Callee
   *    : MemberExpression
   *    | CallExpression
   *
   */
  CallExpression(callee: AstNode): AstNode {
    const args = this.Arguments();
    const callExpresion = {
      type: 'CallExpression',
      evaluate: (env: ExecutionEnvironment) => {
        const resolvedArgs = args.map((a) => a.evaluate(env));
        const resolvedCallee = callee.evaluate(env);
        if (typeof resolvedCallee === 'function') {
          return resolvedCallee(...resolvedArgs);
        }
        const str = `${resolvedCallee}(${resolvedArgs})`;
        console.log(str);
        return eval(str);
      },
      callee,
      arguments: args,
    };

    return callExpresion;
  }

  /**
   *  Arguments
   *    : '(' ArgumentList ')'
   */
  Arguments(): AstNode[] {
    this._eat('(');

    const argumentList =
      this._lookahead.type !== ')' ? this.ArgumentList() : [];

    this._eat(')');

    return argumentList;
  }

  /**
   * ArgumentList
   *    : Argument
   *    | ArgumentList ',' Argument
   */
  ArgumentList(): AstNode[] {
    const argumentList = [];
    do {
      argumentList.push(this.Argument());
    } while (this._lookahead?.type === ',' && this._eat(','));
    return argumentList;
  }

  /**
   * Argument
   *    : Variable
   *    | Literal
   *    ;
   */
  Argument() {
    switch (this._lookahead.type) {
      case '$':
        return this.Variable();
      case 'IDENTIFIER':
        return this.Identifier();
    }
    return this.Literal();
  }

  /**
   * MemberExpression
   *   : PrimaryExpression
   *   | MemberExpression '.' Identifier
   *   ;
   */
  MemberExpression() {
    let object = this.PrimaryExpression();

    while (this._lookahead?.type === '.') {
      this._eat('.');
      const property = this.Identifier();
      const objEvaluate = object.evaluate;
      object = {
        type: 'MemberExpression',
        object,
        property,
        evaluate: (env) => {
          const objValue = objEvaluate(env);
          const propValue = property.evaluate(env);
          const toReturn = objValue[propValue];
          if (this._isFunction(toReturn)) {
            return toReturn();
          }
          return toReturn;
        },
      };
    }
    return object;
  }

  private _isFunction(value: any) {
    return typeof value === 'function';
  }

  /**
   * PrimaryExpression
   *    : Identifier
   *    | Variable
   *    | Literal
   */
  PrimaryExpression(): AstNode {
    switch (this._lookahead.type) {
      case '$':
        return this.Variable();
      case 'IDENTIFIER':
        return this.Identifier();
    }
    return this.Literal();
  }

  /**
   * EqualityOperation
   *    : Operand "==" Operand
   *
   */
  EqualityOperation(left: AstNode): AstNodeOperation {
    const operator = this._eat('EQUALITY_OPERATOR').value;
    const right = this.PrimaryExpression();

    return {
      type: 'EqualityOperation',
      operator,
      evaluate: (env) => {
        const l = this._parseArgsForOperation(left.evaluate(env));
        const r = this._parseArgsForOperation(right.evaluate(env));
        const str = `${l}${operator}${r}`;
        return eval(str);
      },
      arguments: [left, right],
    };
  }

  private _parseArgsForOperation(value: any) {
    switch (typeof value) {
      case 'string':
        return `"${value}"`;
      default:
        return value;
    }
  }

  /**
   * Variable
   *    : '$' Identifier
   */
  Variable(): AstNode {
    this._eat('$');
    if (this._lookahead.type === 'IDENTIFIER') {
      const token = this._eat('IDENTIFIER');
      const name = token.value;
      return {
        type: 'Variable',
        evaluate: (env) => {
          const value = this._resolveVariable(env.vars[name]);
          if (value === undefined) {
            throw new ExecutionError(
              `Variable '${name}' could not be resolved`,
            );
          }
          return value;
        },
        name,
      };
    }
    throw new SyntaxError(
      `Unexpected token "${this._lookahead.value}" in string: "${this._string}"`,
    );
  }

  private _resolveVariable(value: any) {
    switch (typeof value) {
      case 'string':
        return `${value}`;
      case 'number':
        return value;
      default:
        return value;
    }
  }

  /**
   * Identifier
   *    : IDENTIFIER
   */
  Identifier(): AstNode {
    const name = this._eat('IDENTIFIER').value;
    return {
      type: 'Identifier',
      evaluate: (env) => {
        const value = env.predefIdent[name];
        if (value === undefined) {
          //   throw new ExecutionError(
          //     `Identifier '${name}' could not be resolved`,
          return name;
          //   );
        }
        return value;
      },
      name,
    };
  }

  /**
   * Literal
   *    : NumericLiteral
   *    | StringLiteral
   *    ;
   */
  Literal() {
    switch (this._lookahead.type) {
      case 'NUMBER':
        return this.NumericLiteral();
      case 'STRING':
        return this.StringLiteral();
    }

    throw new SyntaxError(
      `Literal: unexpected literal production in string: "${this._string}"`,
    );
  }

  /**
   * Numeric Literal
   *    : NUMBER
   *    ;
   */
  NumericLiteral(): AstNode {
    const token = this._eat('NUMBER');
    const value = Number(token.value);
    return {
      evaluate: () => {
        return value;
      },
      type: 'NumericLiteral',
      value,
    };
  }

  /**
   * String Literal
   *    : STRING
   *    ;
   */
  StringLiteral(): AstNode {
    const token = this._eat('STRING');
    const value = `${token.value.slice(1, -1)}`;
    return {
      type: 'StringLiteral',
      value,
      evaluate: () => {
        return value;
      },
    };
  }

  /**
   * Expects a token of the given type
   * @param tokenType
   * @returns
   */
  private _eat(tokenType: string) {
    const token = this._lookahead;
    if (token == null) {
      throw new SyntaxError(
        `Unexpected end of input, expected "${tokenType}" in string: "${this._string}"`,
      );
    }
    if (token.type !== tokenType) {
      throw new SyntaxError(
        `Unexpected token: "${token.value}", expected: "${tokenType}" in string: "${this._string}"`,
      );
    }
    // Go to next token
    this._lookahead = this._tokenizer.getNextToken();
    return token;
  }
}
