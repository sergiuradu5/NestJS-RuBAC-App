import * as ipRange from 'ip-range-check';
/**
 * Function definitions
 */
const inFn = (value: any, ...args: any[]): boolean => {
  return args.some((e) => e === value);
};

export type IPredefFunctionsSpec = {
  [name: string] : (...args: any[]) => any
}

/**
 * Specification for Predefined Functions
 */
export const PredefFunctionsSpec: IPredefFunctionsSpec = {
  ip_range: ipRange,
  in: inFn,
};