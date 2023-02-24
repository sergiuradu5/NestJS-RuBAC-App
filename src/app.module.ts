import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { RubacModule } from './rubac/rubac.module';

@Module({
  imports: [ConfigModule.forRoot(), RubacModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
