import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { Workflow } from './decorators/workflows.enum';
import { RubacService } from './rubac.service';

@Injectable()
export class RubacGuard implements CanActivate {
  constructor(private rubacService: RubacService, private reflector: Reflector) {

  }
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const workflowId = this.reflector.get<Workflow>('workflowId', context.getHandler());
    if (!workflowId) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    request['getPath'] = () => request.path;
    user['getIpAddress'] = () => request.ip;
    user['getRole'] = () => user.roles

    const result = this.rubacService.testAgainstRules(user, request, workflowId.toString());
    if (typeof result === 'boolean' ) {
      return result;
    }
    return true;
  }
}
