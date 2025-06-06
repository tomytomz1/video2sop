import { PrismaClient, ShareableLink, AccessToken } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';

export class ShareableService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createShareableLink(
    jobId: string,
    userId: string,
    options: {
      expiresIn?: number; // in hours
      maxUses?: number;
    } = {}
  ): Promise<ShareableLink> {
    const { expiresIn = 24, maxUses = 1 } = options;

    // Verify job exists and belongs to user
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new AppError('Job not found or access denied', 404);
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);

    return this.prisma.shareableLink.create({
      data: {
        jobId,
        token,
        expiresAt,
        maxUses,
        createdBy: userId,
      },
    });
  }

  async validateShareableLink(token: string): Promise<ShareableLink> {
    const link = await this.prisma.shareableLink.findUnique({
      where: { token },
      include: { job: true },
    });

    if (!link) {
      throw new AppError('Invalid or expired link', 404);
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new AppError('Link has expired', 410);
    }

    if (typeof link.maxUses === 'number' && link.useCount >= link.maxUses) {
      throw new AppError('Link has reached maximum uses', 410);
    }

    // Increment use count
    await this.prisma.shareableLink.update({
      where: { id: link.id },
      data: { useCount: { increment: 1 } },
    });

    return link;
  }

  async createAccessToken(
    userId: string,
    options: {
      name: string;
      expiresIn?: number; // in hours
      permissions?: Record<string, boolean>;
    }
  ): Promise<AccessToken> {
    const { name, expiresIn, permissions = {} } = options;

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 60 * 60 * 1000)
      : null;

    return this.prisma.accessToken.create({
      data: {
        userId,
        token,
        name,
        expiresAt,
        permissions,
      },
    });
  }

  async validateAccessToken(token: string): Promise<AccessToken> {
    const accessToken = await this.prisma.accessToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!accessToken) {
      throw new AppError('Invalid access token', 401);
    }

    if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
      throw new AppError('Access token has expired', 401);
    }

    // Update last used timestamp
    await this.prisma.accessToken.update({
      where: { id: accessToken.id },
      data: { lastUsedAt: new Date() },
    });

    return accessToken;
  }

  async revokeAccessToken(tokenId: string, userId: string): Promise<void> {
    const token = await this.prisma.accessToken.findFirst({
      where: {
        id: tokenId,
        userId,
      },
    });

    if (!token) {
      throw new AppError('Token not found or access denied', 404);
    }

    await this.prisma.accessToken.delete({
      where: { id: tokenId },
    });
  }

  async listAccessTokens(userId: string): Promise<AccessToken[]> {
    return this.prisma.accessToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteExpiredLinks(): Promise<void> {
    const result = await this.prisma.shareableLink.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { useCount: { gte: this.prisma.shareableLink.fields.maxUses } },
        ],
      },
    });

    logger.info(`Deleted ${result.count} expired shareable links`);
  }

  async createLink(jobId: string, userId: string, expiresAt?: Date, maxUses?: number) {
    const link = await this.prisma.shareableLink.create({
      data: {
        jobId,
        createdBy: userId,
        token: this.generateToken(),
        expiresAt: expiresAt ?? null,
        maxUses: maxUses ?? null,
      },
    });
    return link;
  }

  async getLink(token: string) {
    return this.prisma.shareableLink.findUnique({
      where: { token },
      include: { job: true },
    });
  }

  async listLinks(userId: string) {
    return this.prisma.shareableLink.findMany({
      where: { createdBy: userId },
      include: { job: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteLink(token: string, userId: string) {
    const link = await this.prisma.shareableLink.findUnique({
      where: { token },
    });
    if (!link) throw new Error('Link not found');
    if (link.createdBy !== userId) throw new Error('Unauthorized');
    await this.prisma.shareableLink.delete({ where: { token } });
  }

  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
} 