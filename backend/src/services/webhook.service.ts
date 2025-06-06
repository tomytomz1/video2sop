import { PrismaClient } from '@prisma/client';
import { randomBytes, createHmac } from 'crypto';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import fetch from 'node-fetch';
import crypto from 'crypto';

export class WebhookService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createWebhook(userId: string, url: string, events: string[], description?: string) {
    const webhook = await this.prisma.webhook.create({
      data: {
        userId,
        url,
        events,
        secret: this.generateSecret(),
        description: description || null,
      },
    });
    return webhook;
  }

  async validateWebhookSignature(
    webhookId: string,
    signature: string,
    payload: string
  ): Promise<boolean> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    const hmac = createHmac('sha256', webhook.secret);
    const calculatedSignature = hmac.update(payload).digest('hex');

    return signature === calculatedSignature;
  }

  async triggerWebhook(
    webhookId: string,
    event: string,
    payload: any
  ): Promise<void> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    if (!webhook.events.includes(event)) {
      logger.warn(`Webhook ${webhookId} not subscribed to event ${event}`);
      return;
    }

    const signature = createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Log successful delivery
      await this.prisma.webhookDelivery.create({
        data: {
          webhookId,
          event,
          status: 'success',
          response: await response.text(),
        },
      });
    } catch (error) {
      // Log failed delivery
      await this.prisma.webhookDelivery.create({
        data: {
          webhookId,
          event,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // Retry logic
      await this.scheduleRetry(webhookId, event, payload);
    }
  }

  private async scheduleRetry(
    webhookId: string,
    event: string,
    payload: any
  ): Promise<void> {
    const maxRetries = 3;
    const retryDelays = [5, 15, 45]; // minutes

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelays[attempt] * 60 * 1000)
        );

        await this.triggerWebhook(webhookId, event, payload);
        return;
      } catch (error) {
        logger.error(
          `Webhook retry ${attempt + 1}/${maxRetries} failed:`,
          error
        );
      }
    }

    logger.error(
      `Webhook ${webhookId} failed after ${maxRetries} retries`
    );
  }

  async listWebhooks(userId: string) {
    return this.prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteWebhook(id: string, userId: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    if (webhook.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await this.prisma.webhook.delete({
      where: { id },
    });
  }

  async updateWebhook(id: string, userId: string, data: { url?: string; events?: string[]; description?: string }) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    if (webhook.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return this.prisma.webhook.update({
      where: { id },
      data,
    });
  }

  private generateSecret(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  async getWebhookDeliveries(
    webhookId: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: string;
    } = {}
  ) {
    const { limit = 50, offset = 0, status } = options;

    const webhook = await this.prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!webhook) {
      throw new AppError('Webhook not found or access denied', 404);
    }

    return this.prisma.webhookDelivery.findMany({
      where: {
        webhookId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getWebhook(id: string, userId: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    if (webhook.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return webhook;
  }

  async testWebhook(id: string, userId: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    if (webhook.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Send a test payload
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook',
      },
    };

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': this.generateSignature(testPayload, webhook.secret),
        },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        throw new Error(`Webhook test failed: ${response.statusText}`);
      }

      return {
        success: true,
        message: 'Webhook test successful',
        response: await response.text(),
      };
    } catch (error) {
      throw new Error(`Webhook test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateSignature(payload: any, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }
} 