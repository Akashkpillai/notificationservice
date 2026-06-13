import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  providers: [],
  exports: [],
  controllers: [HealthController],
})
export class HealthModule { }
