import {
  BadRequestException,
  Injectable, Logger
} from '@nestjs/common';
import * as fs from 'fs';
import { IUser } from 'src/users/types/user.interface';
import { resolveParams, tryOperations } from './rubac.service.utils';
import { IWorkflow } from './types/json-workflow.interface';
import { IPreparedRules } from './types/prepared-rules.interface';
import { IRequest } from './types/request.interface';

@Injectable()
export class RubacService {
  private readonly logger = new Logger(RubacService.name);
  private rulesPlainJson!: IWorkflow;
  private preparedRules!: IPreparedRules;
  constructor() {
    const rulesJsonPath = process.env.RULES_JSON_PATH;
    fs.promises.readFile(rulesJsonPath, 'utf8').then((data) => {
      this.parseJsonRules(data);
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
            return 'admin/';
          },
        } as any,
      );
      console.log(test);
    });
  }

  private async parseJsonRules(jsonString: string) {
    const json = JSON.parse(jsonString) as IWorkflow;
    this.rulesPlainJson = json;
    this.logger.log(`${json.WorkflowName} workflow loaded successfully`);
    const preparedRules = this.rulesPlainJson.Rules.reduce(
      (acc: IPreparedRules, rule) => {
        // Try multiple operations
        const result = tryOperations(rule.Expression);
        console.log(rule.Expression, result);
        if (!result) {
          this.logger.warn(
            `Rule Expression ${rule.Expression} could be translated into a function`,
          );
          return acc;
        }
        acc[rule.RuleName] = result;
        return acc;
      },
      {},
    );
    if (Object.keys(preparedRules).length) {
      this.preparedRules = preparedRules;
    } else {
      throw new Error(
        `No rule expression could be translated from Workflow ${this.rulesPlainJson.WorkflowName} with id: ${this.rulesPlainJson.WorkflowID}`,
      );
    }
    console.log('this.preparedRules', this.preparedRules);
  }

  public testAgainstRules(user: IUser, request: IRequest): boolean {
    this.logger.log('testAgainstRules starts here');
    // resolvedParams = { 'ip_address': '127.0.0.1' }; // Only resolved values
    const preparedParams = this.rulesPlainJson.Params.reduce((acc, p) => {
      const value = resolveParams(p.Expression, user, request);
      if (value) {
        acc[`$${p.Name}`] = value;
      }
      return acc;
    }, {});
    console.log('preparedParams', preparedParams);
    const rulesWithReplacedParams = this.replaceParamsInRules(preparedParams);
    console.log('replacedParams', rulesWithReplacedParams);
    return this.executeRules(rulesWithReplacedParams);
  }

  private replaceParamsInRules(preparedParams: any) {
    const rulesWithReplacedParams = {};
    for (const [ruleName, obj] of Object.entries(this.preparedRules)) {
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
      rulesWithReplacedParams[ruleName] = { fn: obj.fn, resolvedParams, operator: obj.operator };
    }
    return rulesWithReplacedParams;
  }

  private executeRules(rulesWithReplacedParams: any) {
    for (const [ruleName, obj] of Object.entries(rulesWithReplacedParams)) {
      const passesRule = (obj as any).fn(...(obj as any).resolvedParams);
      if (passesRule) {
        this.logger.debug(`${ruleName} passed`);
        this.logger.verbose(
          `${ruleName} returned true from execution: ${(obj as any).operator}(${
            (obj as any).resolvedParams
          })`,
        );
      } else {
        this.logger.debug(`${ruleName} did not pass`);
        this.logger.verbose(
          `${ruleName} returned false from execution: ${
            (obj as any).operator
          }(${(obj as any).resolvedParams})`,
        );
        return false;
      }
    }
    // all passed, return true
    return true;
  }
}
