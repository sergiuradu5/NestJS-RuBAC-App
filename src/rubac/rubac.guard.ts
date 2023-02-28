import { IUser } from 'src/users/types/user.interface';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { Workflow } from './decorators/workflows.enum';
import { RubacService } from './rubac.service';
import { IRequest } from './types/request.interface';

@Injectable()
export class RubacGuard implements CanActivate {
  constructor(
    private rubacService: RubacService,
    private reflector: Reflector,
  ) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const workflowId = this.reflector.get<Workflow>(
      'workflowId',
      context.getHandler(),
    );
    if (!workflowId) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // NOTE: Generally, the `user` property of `request` is injected by middleware/guards that perform authentication before any authorization
    // No authentication is provided in this app, and for the purpose of simplicity, the `user` property is mocked and it is retrieved from the 'Role' request header
    // If no header is provided, it is assumed to have the role 'USER'
    const user: IUser = {
      getRole: () => request.get('Role') ?? 'USER',
    };

    const req: IRequest = {
      getIpAddress: () => request.ip,
      getPath: () => request.path,
    };

    const result = this.rubacService.testAgainstRules(
      user,
      req,
      workflowId.toString(),
    );
    return result;
  }
}
