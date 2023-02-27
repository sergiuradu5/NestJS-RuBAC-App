import { IOperation } from './types/prepared-rules.interface';
import { IUser } from 'src/users/types/user.interface';
import { IRequest } from './types/request.interface';
import * as ipRange from 'ip-range-check';

function cleanUpPath(path: string): string {
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  if (path.endsWith('/')) {
    path = path.slice(0, path.length - 1);
  }
  return path;
}

export function checkPath(reqPath: string, rulePath: string): boolean {
  reqPath = cleanUpPath(reqPath);
  rulePath = cleanUpPath(rulePath);
  const reqPathArr = reqPath.split('/');
  const rulePathArr = rulePath.split('/');
  for(const [ind, str ] of reqPathArr.entries()) {
    const s = str.trim(),
      rs = rulePathArr[ind].trim();
    if (rs === '*') {
      return true;
    }
    if (s !== rs) {
      return false;
    }
  };
  return true;
}

export function resolveRequestParams(
  expression: string,
  user: IUser,
  request: IRequest,
) {
  const definedParamExpressions = {
    // TODO: postoje samo dve vrste objekata, user i request
    // Separate it on '.'
    // Right of '.' is custom, and treat is as string
    // { 'request':  request, 'user': user}
  
    '$request.getIpAddress': request.getIpAddress() as string,
    '$request.getPath': request.getPath() as string,
    '$user.getRole': user.getRole() as string,
  };
  const res = definedParamExpressions[expression.trim()];
  return res;
}

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
      operator: 'in()',
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
      operator: 'ip_range()',
    };
  }
}

export function tryEqualsOperation(expression: string): IOperation | undefined {
  const equalsRegExp =
    /^(\$[a-zA-Z_]\w*|'[^\']*')\s*==\s*(\$[a-zA-Z_]\w*|'[^\']*')$/;
  const isEqual = equalsRegExp.test(expression);

  if (!isEqual) {
    return undefined;
  }
  const stringParams = expression.split('==').map((s) => s.trim());
  if (stringParams) {
    return {
      stringParams,
      fn: Object.is,
      operator: '==',
    };
  }
}
