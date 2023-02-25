import { Controller, Get } from '@nestjs/common';
import { Rubac } from './rubac/decorators/rubac.decorator';
import { Workflow } from './rubac/decorators/workflows.enum';

@Controller()
export class AppController {
  @Rubac(Workflow.AllowOnlySpecificIpForAdmin)
  @Get('/admin/w1')
  getWorkflow1(): string {
    return 'Workflow 1 passed successfully';
  }

  @Rubac(Workflow.AllowOnlySpecificIpsForAdminAndSuperAdmin)
  @Get('admin/w2')
  getWorkflow2(): string {
    return 'Workflow 2 passed successfully';
  }
}
