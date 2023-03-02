import { AstNode } from '../parser/parser';
/**
 * @ignore
 * @deprecated
 * The purpose of Evaluator was to evaluate an AST by using the switch case technique.
 * A much more elegant approach is to define the evaluation method inside the parser.
 * In this way, all the data in regards to the nodes is kept inside the parser.
 */
export class Evaluator {
  evalArray(arr: AstNode[], environment: any) {
    const allArgs = [];
    for (const node of arr) {
      if (!Array.isArray(node)) {
        allArgs.push(this.evaluate(node, environment));
      } else {
        allArgs.push(...this.evalArray(node, environment));
      }
    }

    return allArgs;
  }

  evaluate(ast: AstNode, environment: any) {
    switch (ast['type']) {
      case 'Variable':
        //TODO: throw error if 'name' not found
        return environment[ast['name']];
      case 'Identifier':
      case 'StringLiteral':
      case 'NumericLiteral':
        return ast['value'];
      case 'CallExpression': {
        const result = ast['callee']['value'](
          ...this.evalArray(ast['arguments'], environment),
        );
        return result;
      }
      case 'EqualityOperation': {
        const operator = ast['operator'] as string;
        const left = this.evaluate(ast['arguments'][0], environment);
        const right = this.evaluate(ast['arguments'][1], environment);
        const str = `"${left}"${operator}"${right}"`;
        return eval(str);
      }
      case 'CallExpression': {
      }
    }
    for (const [key, n] of Object.entries(ast)) {
      if (typeof n === 'object' && !Array.isArray(n)) {
        return this.evaluate(n, environment);
      }
    }
  }
}
