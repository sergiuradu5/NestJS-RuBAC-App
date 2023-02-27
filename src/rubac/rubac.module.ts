import { Interpreter } from './interpreter/Interpreter';
import { Module } from '@nestjs/common';
import { Parser } from './parser/Parser';
import { RubacService } from './rubac.service';

@Module({
  providers: [RubacService, Parser, Interpreter],
})
export class RubacModule {}
