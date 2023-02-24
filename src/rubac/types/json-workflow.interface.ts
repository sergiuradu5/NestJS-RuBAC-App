export interface IRuleParams {
  Name: string;
  Expression: string;
}

export interface IRule {
  RuleName: string;
  Expression: string;
}

export interface IWorkflow {
  WorkflowID: number;
  WorkflowName: string;
  Path: string;
  Params: IRuleParams[];
  Rules: IRule[];
}
