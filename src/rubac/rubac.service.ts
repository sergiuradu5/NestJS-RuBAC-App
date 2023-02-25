import { Workflow } from './decorators/workflows.enum';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { IUser } from 'src/users/types/user.interface';
import {
  checkPath,
  resolveRequestParams,
  tryOperations,
} from './rubac.service.utils';
import {
  IRule,
  IWorkflow,
  IWorkflowParams,
} from './types/json-workflow.interface';
import { IPreparedRules } from './types/prepared-rules.interface';
import { IRequest } from './types/request.interface';

type IWorkflowWithPreparedRules = {
  PreparedRules: IPreparedRules;
} & IWorkflow;

interface IWorkflows {
  [name: string]: IWorkflowWithPreparedRules;
}

interface IResolvedRequestParams {
  [name: string]: string;
}

interface IRulesWithResolvedParams {
  [ruleName: string]: {
    operator: string;
    fn: (...args: any[]) => boolean;
    params: string[];
  };
}

@Injectable()
export class RubacService {
  private readonly logger = new Logger(RubacService.name);
  private workflows!: IWorkflows;
  constructor() {
    const rulesFolderPath = process.env.RULES_FOLDER;
    this.loadAllWorkflows(rulesFolderPath).then((data) => {
      const test = this.testAgainstRules(
        {
          getRole() {
            return 'ADMIN';
          },
        },
        {
          getIpAddress() {
            return '100.100.100.100';
          },
          getPath() {
            return 'admin/users';
          },
        },
        Workflow.AllowOnlySpecificIpForAdmin,
      );
    });
  }

  private async loadAllWorkflows(rulesFolderPath: string): Promise<void> {
    const files = await fs.promises.readdir(rulesFolderPath, 'utf8');
    this.workflows = {};
    await Promise.all(
      files.map(async (filePath) => {
        const data = await fs.promises.readFile(
          path.join(rulesFolderPath, filePath),
          'utf-8',
        );
        await this.loadWorkflowWithPreparedRules(data);
      }),
    );
  }

  private async loadWorkflowWithPreparedRules(
    jsonString: string,
  ): Promise<void> {
    const workflow = JSON.parse(jsonString) as IWorkflowWithPreparedRules;

    // Transform a rule expression into an actual function
    const preparedRules = workflow.Rules.reduce(
      (acc: IPreparedRules, rule: IRule) => {
        // Try multiple operation expressions and see which one matches
        const result = tryOperations(rule.Expression);
        if (!result) {
          throw new Error(
            `Rule Expression ${rule.Expression} in workflow with id '${workflow.WorkflowID}' could not be translated into a function`,
          );
        }
        acc[rule.RuleName] = result;
        return acc;
      },
      {} as IPreparedRules,
    );

    // If all rule expressions were translated correctly, assign the current workflow to the service
    workflow.PreparedRules = preparedRules;
    this.workflows[workflow.WorkflowID] = workflow;
    this.logger.log(
      `Workflow with id:${workflow.WorkflowID} loaded successfully: '${workflow.WorkflowName}'`,
    );
  }
  /** Method for testing the current request and user against the selected workflow rules
   * @param {IUser} user
   * @param {IRequest} request
   * @param {Workflow | string} workflowId
   * @returns {boolean | undefined} Returns `undefined` if the request path and the one specified in the worklow do not match.
   * Returns `true` or `false` whether the tested rules of the matching paths pass or don't pass
   */
  public testAgainstRules(
    user: IUser,
    request: IRequest,
    workflowId: string,
  ): boolean | undefined {
    const isMatch = checkPath(
      request.getPath(),
      this.workflows[workflowId].Path,
    );
    if (!isMatch) {
      return true;
    }
    console.log('preparedRules', this.workflows[workflowId].PreparedRules);
    const resolvedRequestParams = this.resolveRequestParams(
      workflowId,
      user,
      request,
    );
    console.log('resolvedRequestParams', resolvedRequestParams);
    const rulesWithReplacedParams = this.replaceParamsInRules(
      workflowId,
      resolvedRequestParams,
    );
    console.log('rulesWithReplacedParams', rulesWithReplacedParams);
    return this.executeRules(rulesWithReplacedParams, workflowId);
  }

  private resolveRequestParams(
    workflowId: string,
    user: IUser,
    request: IRequest,
  ): IResolvedRequestParams {
    const params = this.workflows[workflowId].Params.reduce(
      (acc: IResolvedRequestParams, p: IWorkflowParams) => {
        const value = resolveRequestParams(p.Expression, user, request);
        if (value) {
          acc[`$${p.Name}`] = value;
        }
        return acc;
      },
      {} as IResolvedRequestParams,
    );
    return params;
  }

  private replaceParamsInRules(
    workflowId: string,
    preparedParams: IResolvedRequestParams,
  ): IRulesWithResolvedParams {
    const rulesWithReplacedParams: IRulesWithResolvedParams = {};
    for (const [ruleName, obj] of Object.entries(
      this.workflows[workflowId].PreparedRules,
    )) {
      const resolvedParams = obj.stringParams.map((sParam) => {
        if (sParam.startsWith('$')) {
          return preparedParams[sParam];
        }
        if (sParam.startsWith("'") && sParam.endsWith("'")) {
          return sParam.substring(1, sParam.length - 1);
        }
        throw new BadRequestException(
          `${sParam} parameter invalid in rule: ${ruleName}`,
        );
      });
      rulesWithReplacedParams[ruleName] = {
        fn: obj.fn,
        params: resolvedParams,
        operator: obj.operator,
      };
    }
    return rulesWithReplacedParams;
  }

  private executeRules(
    rulesWithReplacedParams: IRulesWithResolvedParams,
    workflowId?: string,
  ): boolean {
    for (const [ruleName, obj] of Object.entries(rulesWithReplacedParams)) {
      const passesRule = obj.fn(...obj.params);
      if (passesRule) {
        this.logger.debug(`${ruleName} passed`);
        this.logger.verbose(
          `Returned true from execution: ${JSON.stringify(
            { workflowId, ruleName, ...obj },
            undefined,
            2,
          )})`,
        );
      } else {
        this.logger.debug(`${ruleName} did not pass`);
        this.logger.verbose(
          `Returned false from execution: ${JSON.stringify(
            { workflowId, ruleName, ...obj },
            undefined,
            2,
          )})`,
        );
        return false;
      }
    }
    // all passed, return true
    return true;
  }
}
