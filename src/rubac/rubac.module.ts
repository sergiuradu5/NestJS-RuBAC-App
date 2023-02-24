import { Module } from '@nestjs/common';
import { RubacService } from './rubac.service';

@Module({
  providers: [RubacService]
})
export class RubacModule {}
