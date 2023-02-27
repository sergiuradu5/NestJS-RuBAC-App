import { Inject, Injectable } from '@nestjs/common';
import { IUser } from 'src/users/types/user.interface';
import { CompilationError } from '../errors/errors';
import { ExecutionEnvironment, Interpreter } from '../interpreter/Interpreter';
import {
  IPredefFunctionsSpec, PredefFunctionsSpec
} from '../interpreter/predefined-env-functions';
import { AstNode, Parser } from '../parser/Parser';
import { IRequest } from '../types/request.interface';
import { IParams, IRule, IWorkflow } from './workflow.interface';

export class Workflow implements IWorkflow {
  WorkflowID: number;
  WorkflowName: string;
  Path: string;
  Params: IParams[];
  Rules: IRule[];

  constructor(json: IWorkflow, private interpreter: Interpreter, private parser: Parser) {

    // Parsing of Params
    const vars = [];
    for (const [idx, param] of json.Params.entries()) {
      const ast = this.parser.parse(param.Expression);
      // Params are not full expressions but Variable, MemberExpressions with Variable, or Literal
      this.checkForPrimaryExpression(ast);
      vars.push(`$${param.Name}`);
      json.Params[idx].Ast = ast;
    }
    // Parsing of Rules
    for (const [idx, rule] of json.Rules.entries()) {
      const ast = this.parser.parse(rule.Expression);
      // It throws an error if variables are used in the Rules, but not defined in the Params section
      this.checkForPredefFunctionsAndVars(ast, PredefFunctionsSpec, vars);
      json.Rules[idx].Ast = ast;
    }
    Object.assign(this, json);
  }

  async executeRules(user: IUser, request: IRequest) {
    // STEP 1: Resolve Environment
    let environment: ExecutionEnvironment = {
      ...PredefFunctionsSpec,
      $user: user,
      $request: request,
    };

    const resolvedReqParams = this.resolveReqParams(user, request, environment);

    environment = {
      ...environment,
      ...resolvedReqParams,
    };

    const resultsFromRules = await Promise.all(
      this.Rules.map((rule) => {
        return this.interpreter.evaluate(rule.Ast, environment);
      }),
    );
    return !resultsFromRules.some((res) => res === false);
  }

  private resolveReqParams(
    user: IUser,
    request: IRequest,
    env: ExecutionEnvironment,
  ) {
    const resolvedReqParams = {};
    for (const param of this.Params) {
      const evaluation = this.interpreter.evaluate(param.Ast, env);
      resolvedReqParams[`$${param.Name}`] = evaluation;
    }
    return resolvedReqParams;
  }

  private checkForPredefFunctionsAndVars(
    ast: AstNode,
    predefFunctions?: IPredefFunctionsSpec,
    variables?: string[],
  ) {
    predefFunctions = predefFunctions ?? PredefFunctionsSpec;
    this.interpreter.visit(ast, {
      Identifier(node, parent, key, index) {
        if (
          parent.type === 'CallExpression' &&
          predefFunctions[node.name] === undefined
        ) {
          throw new CompilationError(`Function "${node.name} is not defined"`);
        }
      },
      Variable(node, parent) {
        if (!variables?.length) return;
        if (!variables.includes(node.name)) {
          throw new CompilationError(
            `Variable "${node.name}" does not exist in Workflow`,
          );
        }
      },
    });
  }

  private checkForPrimaryExpression(ast: AstNode) {
    this.interpreter.visit(ast, {
      Node(node, parent, key, index) {
        const supportedPrimaryExpressions = [
          'MemberExpression',
          'Variable',
          'Identifier',
        ];
        if (!supportedPrimaryExpressions.includes(node.type)) {
          throw new CompilationError(
            `Only Primary Expressions supported, but received "${node.type}"`,
          );
        }
      },
    });
  }
}
