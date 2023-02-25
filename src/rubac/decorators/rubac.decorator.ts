import { SetMetadata } from '@nestjs/common';
import { Workflow } from './workflows.enum';

export const Rubac = (workflowEnum: Workflow) => SetMetadata('workflowId', workflowEnum);