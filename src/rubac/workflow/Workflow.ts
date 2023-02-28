import { Inject, Injectable, Logger } from '@nestjs/common';
import { IUser } from 'src/users/types/user.interface';
import { CompilationError } from '../errors/errors';
import { ExecutionEnvironment, Interpreter } from '../interpreter/Interpreter';
import {
  IPredefIdentSpec,
  PredefIdentSpec,
} from '../interpreter/predefined-env-identifiers';
import { AstNode, Parser } from '../parser/Parser';
import { EvaluatedRule } from '../types/evaluated-rule.interface';
import { IRequest } from '../types/request.interface';
import { IParams, IRule, IWorkflow } from './workflow.interface';

export class Workflow implements IWorkflow {
  private logger = new Logger(Workflow.name);

  WorkflowID: number;
  WorkflowName: string;
  Path: string;
  Params: IParams[];
  Rules: IRule[];

  constructor(
    json: IWorkflow,
    private interpreter: Interpreter,
    private parser: Parser,
  ) {
    // Parsing of Params
    const vars = [];
    for (const [idx, param] of json.Params.entries()) {
      const ast = this.parser.parse(param.Expression);
      // Params are not full expressions but Variable, MemberExpressions with Variable, or Literal
      this.checkForPrimaryExpression(ast);
      vars.push(`${param.Name}`);
      json.Params[idx].Ast = ast;
    }

    // Parsing of Rules
    for (const [idx, rule] of json.Rules.entries()) {
      const ast = this.parser.parse(rule.Expression);
      // It throws an error if variables are used in the Rules, but not defined in the Params section
      this.checkForPredefIdentsAndVars(ast, PredefIdentSpec, vars);
      json.Rules[idx].Ast = ast;
    }
    Object.assign(this, json);
  }

  async executeRules(user: IUser, request: IRequest) {
    // Inserting predefined functions and `user` with `request` into this execution environment
    let environment: ExecutionEnvironment = {
      predefIdent: {
        ...PredefIdentSpec,
      },
      vars: {
        user: user,
        request: request,
      },
    };

    // Evaluate Request Params with the current environment
    const resolvedReqParams = this.evaluateReqParams(environment);

    // Update the current environment with the evaluations from previous step
    environment = {
      ...environment,
      vars: {
        ...environment.vars,
        ...resolvedReqParams,
      },
    };

    // Evaluate Rules with the resolved Request Params now available inside the current execution environment
    const resultsFromRules = await this.evaluateRules(environment);
    return !resultsFromRules.some((res) => res.Evaluation === false);
  }

  /**
   * Evaluates the Request Params and returns their evaluation in a map
   * @param {ExecutionEnvironment} env Passing the execution environment
   * @returns {any} Returns a map of  actual values that emerge from executing `evaluate` on `AstNode`s of `Params`
   */
  private evaluateReqParams(env: ExecutionEnvironment) {
    const resolvedReqParams = {};
    for (const param of this.Params) {
      const evaluation = this.interpreter.evaluate(param.Ast, env);
      resolvedReqParams[`${param.Name}`] = evaluation;
    }
    // e.g. { 'ip_address': '100.100.100.1' }
    return resolvedReqParams;
  }

  private checkForPredefIdentsAndVars(
    ast: AstNode,
    predefFunctions?: IPredefIdentSpec,
    variables?: string[],
  ): void {
    predefFunctions = predefFunctions ?? PredefIdentSpec;
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

        const errorIfNotDefined = (nodeName: string) => {
          if (PredefIdentSpec[nodeName] === undefined) {
            throw new CompilationError(`Unknown identifier "${node.name}"`);
          }
        };

        if (node.type === 'Identifier' && parent == undefined) {
          errorIfNotDefined(node.name);
        }

        if (
          node.type === 'Identifier' &&
          parent?.type === 'MemberExpression' &&
          parent?.object?.type === node.type
        ) {
          errorIfNotDefined(node.name);
        }
      },
    });
  }

  private async evaluateRules(
    env: ExecutionEnvironment,
  ): Promise<EvaluatedRule[]> {
    const logEval = (
      env: ExecutionEnvironment,
      rule: IRule,
      result: EvaluatedRule,
    ) => {
      this.logger.debug(`Rule Evaluated: ${JSON.stringify(result)}`);
      this.logger.verbose(
        `Environment: ${JSON.stringify(env, (key, value) => {
          if (typeof value === 'function') {
            return value.name;
          }
          return value;
        })}`,
      );
      this.logger.verbose(`Expression: ${rule.Expression}`);
    };

    const results: EvaluatedRule[] = await Promise.all(
      this.Rules.map(async (rule) => {
        const result = {
          RuleName: rule.RuleName,
          Evaluation: await this.interpreter.evaluate(rule.Ast, env),
        };
        logEval(env, rule, result);
        return result;
      }),
    );
    return results;
  }
}
