import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { QueueModule } from '../queue/queue.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [QueueModule, LeadsModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
})
export class CampaignsModule {}
