import { AstNode } from "../parser/Parser";

export interface IParams {
  Name: string;
  Expression: string;
  Ast?: AstNode;
}

export interface IRule {
  RuleName: string;
  Expression: string;
  Ast?: AstNode;
}

export interface IWorkflow {
  WorkflowID: number;
  WorkflowName: string;
  Path: string;
  Params: IParams[];
  Rules: IRule[];
}