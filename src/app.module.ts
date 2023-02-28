import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { RubacModule } from './rubac/rubac.module';

const ENV = process.env.NODE_ENV;

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: !ENV ? '.env.dev' : `.env.${ENV}`,
    }),
    RubacModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
