import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Interpreter } from './interpreter/Interpreter';
import { Parser } from './parser/Parser';
import { RubacGuard } from './rubac.guard';
import { RubacService } from './rubac.service';
import rulesConfig from '../config/rules';
@Module({
  imports: [ConfigModule.forFeature(rulesConfig)],
  providers: [
    RubacService,
    Parser,
    Interpreter,
    {
      provide: APP_GUARD,
      useClass: RubacGuard,
    },
  ],
})
export class RubacModule {}
