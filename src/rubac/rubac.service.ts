import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { IUser } from 'src/users/types/user.interface';
import { Workflow as WorkflowEnum } from './decorators/workflows.enum';
import { Interpreter } from './interpreter/Interpreter';
import { Parser } from './parser/Parser';
import { checkPath } from './rubac.service.utils';
import { IRequest } from './types/request.interface';
import { Workflow } from './workflow/Workflow';
import { IWorkflow } from './workflow/workflow.interface';

interface IWorkflows {
  [name: string]: Workflow;
}

@Injectable()
export class RubacService {
  private readonly logger = new Logger(RubacService.name);
  private workflows!: IWorkflows;
  constructor(private interpreter: Interpreter, private parser: Parser) {
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
            return '100.100.100.1';
          },
          getPath() {
            return 'admin/users';
          },
        },
        WorkflowEnum.AllowOnlySpecificIpsForAdminAndSuperAdmin,
      );

      const test2 = this.testAgainstRules(
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
        WorkflowEnum.AllowOnlySpecificIpForAdmin,
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
    const jsonWorkflow = JSON.parse(jsonString) as IWorkflow;

    // During instantiation internal parser parses all expressions to check for syntactic accuracy
    const workflow = new Workflow(jsonWorkflow, this.interpreter, this.parser);

    // If all rule expressions were parsed correctly, assign the current workflow to the service
    this.workflows[workflow.WorkflowID] = workflow;
    this.logger.log(
      `Workflow with id:${workflow.WorkflowID} loaded successfully: '${workflow.WorkflowName}'`,
    );
  }
  /** Method for testing the current request and user against the selected workflow rules
   * @param {IUser} user
   * @param {IRequest} request
   * @param {Workflow | string} workflowId
   * @returns {boolean | undefined} Returns `true` if the request path and the one specified in the worklow do not match.
   * Returns `true` or `false` whether the tested rules of the matching paths pass or don't pass respectively
   */
  public async testAgainstRules(
    user: IUser,
    request: IRequest,
    workflowId: string,
  ): Promise<boolean | undefined> {
    const isMatch = checkPath(
      request.getPath(),
      this.workflows[workflowId].Path,
    );
    if (!isMatch) {
      return true;
    }
    const result = await this.workflows[workflowId].executeRules(user, request);

    console.log(result);

    return result;
  }
}
