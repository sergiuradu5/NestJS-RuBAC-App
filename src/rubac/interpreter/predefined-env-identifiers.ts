import * as ipRange from 'ip-range-check';
/**
 * Function definitions
 */
const inFn = (value: any, ...args: any[]): boolean => {
  return args.some((e) => e === value);
};

export type IPredefIdentSpec = {
  [name: string]: (...args: any[]) => any;
};

/**
 * Specification for Predefined Identifiers (e.g. functions, global objects, etc)
 */
export const PredefIdentSpec: IPredefIdentSpec = {
  ip_range: ipRange,
  in: inFn,
};