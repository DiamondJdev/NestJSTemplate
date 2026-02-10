import { Module } from '@nestjs/common';
import { HealthController } from './controller/health/health.controller';
import { DbModule } from '../db/db.module';

@Module({
    imports: [DbModule],
    controllers: [HealthController],
    providers: [],
    exports: [],
})
export class CommonModule {}
