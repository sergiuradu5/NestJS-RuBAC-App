export interface IOperation {
  stringParams: string[];
  fn: (...args: any[]) => any;
  operator: string;
}

export interface IPreparedRules {
  [key: string]: IOperation;
}
