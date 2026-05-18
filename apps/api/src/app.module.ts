import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './auth/auth.module';
import { LeadsModule } from './leads/leads.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { TemplatesModule } from './templates/templates.module';
import { InboxModule } from './inbox/inbox.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    LeadsModule,
    CampaignsModule,
    TemplatesModule,
    InboxModule,
    ReportsModule,
    SettingsModule,
    QueueModule,
  ],
})
export class AppModule {}
