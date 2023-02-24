import { IOperation } from './types/prepared-rules.interface';
import { IUser } from 'src/users/types/user.interface';
import { IRequest } from './types/request.interface';
import * as ipRange from 'ip-range-check';

export function resolveParams(
  expression: string,
  user: IUser,
  request: IRequest,
) {
  const definedParamExpressions = {
    '$request.getIpAddress': request.getIpAddress(),
    '$request.getPath': request.getPath(),
    '$user.getRole': user.getRole(),
  };
  const res = definedParamExpressions[expression.trim()];
  return res;
}

export function resolveOperations(expression: string) {}

/**
 * `tryOperations` takes a string expression and tries to find out which operation it matches
 * @param {string} exp
 * @returns {IOperation}
 */
export function tryOperations(exp: string): IOperation | undefined {
  return (
    tryInOperation(exp) || tryIpRangeOperation(exp) || tryEqualsOperation(exp)
  );
}

//Tries to see if the expression is an in() operator and if so, returns the array of its parameters inside the function
export function tryInOperation(expression: string): IOperation | undefined {
  const inRegExp = /^in\(.+\)$/; //in(*put here whatever*)
  const isIn = inRegExp.test(expression);
  if (!isIn) {
    return undefined;
  }
  const stringParams = expression
    .split(/[()]/)[1]
    .split(',')
    .map((s) => s.trim());
  if (stringParams) {
    return {
      stringParams,
      fn: inFn,
      operator: 'in()'
    };
  }
}

export function inFn(value: string, ...args: string[]) {
  return args.some((a) => value === a);
}

//Tries to see if the expression is an ip_range() operator and if so, returns the array of its parameters inside the function
export function tryIpRangeOperation(
  expression: string,
): IOperation | undefined {
  const ipRangeRegExp = /^ip_range\(.+\)$/; //ip_range(*put here whatever*)
  const isIpRange = ipRangeRegExp.test(expression);
  if (!isIpRange) {
    return undefined;
  }
  const stringParams = expression
    .split(/[()]/)[1]
    .split(',')
    .slice(0, 2)
    .map((s) => s.trim());
  if (stringParams) {
    return {
      stringParams,
      fn: ipRange,
      operator: 'ip_range()'
    };
  }
}

export function tryEqualsOperation(expression: string): IOperation | undefined {
  const equalsRegExp = /^(\$[a-zA-Z_]\w*|'[^\']*')\s*==\s*(\$[a-zA-Z_]\w*|'[^\']*')$/;
  const isEqual = equalsRegExp.test(expression);

  if (!isEqual) {
    return undefined;
  }
  const stringParams = expression.split('==').map((s) => s.trim());
  if (stringParams) {
    return {
      stringParams,
      fn: Object.is,
      operator: '=='
    };
  }
}

// function tryAsBinaryOperator<EntityClass>(
//   operations: any[],
//   expression: string,
//   symbol: string,
//   operator: (value: string) => FindOperator<string>,
// ): boolean {
//   const index = expression.indexOf(symbol);
//   if (index === -1) {
//     return false;
//   }
//   const key = expression.slice(0, index);
//   const value = expression.slice(index + symbol.length);
//   (factors as Record<string, FindOperator<string>>)[key] = operator(value);
//   return true;
// }

// function extractOperationFromExpression(
//   operations: any[], // operations is an array full of functions that will execute
//   expression: string, //simple string expression, such as '$ip_address == 100.100.100.1
// ) {
//   tryAsBinaryOperator(operations, expression, '<=', LessThanOrEqual) ||
//   tryAsBinaryOperator(operations, expression, '<', LessThan) ||
//   tryAsBinaryOperator(operations, expression, '>=', MoreThanOrEqual) ||
//   tryAsBinaryOperator(operations, expression, '>', MoreThan) ||
//   tryAsBinaryOperator(operations, expression, '!~=', x => Not(ILike(`%${x}`))) ||
//   tryAsBinaryOperator(operations, expression, '!=~', x => Not(ILike(`${x}%`))) ||
//   tryAsBinaryOperator(operations, expression, '!~', x => Not(ILike(`%${x}%`))) ||
//   tryAsBinaryOperator(operations, expression, '~=', x => ILike(`%${x}`)) ||
//   tryAsBinaryOperator(operations, expression, '=~', x => ILike(`${x}%`)) ||
//   tryAsBinaryOperator(operations, expression, '~', x => ILike(`%${x}%`)) ||
//   tryAsBinaryOperator(operations, expression, '!=', x => Not(Equal(x))) ||
//   tryAsBinaryOperator(operations, expression, '=', Equal) ||
//   tryAsUnaryOperator(operations, expression, '!?', IsNull) ||
//   tryAsUnaryOperator(operations, expression, '?', () => Not(IsNull()));
// }
