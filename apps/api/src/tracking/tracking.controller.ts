import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '../common/prisma.module';

@Controller('t')
export class TrackingController {
  constructor(private prisma: PrismaService) {}

  @Get('open/:trackingId')
  async trackOpen(@Param('trackingId') trackingId: string, @Res() res: Response) {
    try {
      // Update send queue with open timestamp
      const sendQueue = await this.prisma.sendQueue.findFirst({
        where: { trackingId },
      });

      if (sendQueue) {
        await this.prisma.sendQueue.update({
          where: { id: sendQueue.id },
          data: { openedAt: new Date() },
        });

        // Update campaign contact
        if (sendQueue.campaignContactId) {
          await this.prisma.campaignContact.update({
            where: { id: sendQueue.campaignContactId },
            data: { openedAt: new Date() },
          });
        }
      }

      // Return 1x1 transparent pixel
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      res.set({
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      });
      res.send(pixel);
    } catch (error) {
      // Still return pixel even on error
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      res.set({ 'Content-Type': 'image/gif' });
      res.send(pixel);
    }
  }

  @Get('click/:trackingId')
  async trackClick(@Param('trackingId') trackingId: string, @Req() req: Request, @Res() res: Response) {
    try {
      // Get the original URL from query
      const url = req.query.url as string;
      if (!url) {
        res.status(400).send('Missing url parameter');
        return;
      }

      // Update send queue with click timestamp
      const sendQueue = await this.prisma.sendQueue.findFirst({
        where: { trackingId },
      });

      if (sendQueue) {
        await this.prisma.sendQueue.update({
          where: { id: sendQueue.id },
          data: { clickedAt: new Date() },
        });

        // Update campaign contact
        if (sendQueue.campaignContactId) {
          await this.prisma.campaignContact.update({
            where: { id: sendQueue.campaignContactId },
            data: { clickedAt: new Date() },
          });
        }
      }

      // Redirect to original URL
      res.redirect(url);
    } catch (error) {
      // Redirect to a safe fallback
      res.redirect('https://example.com');
    }
  }
}
