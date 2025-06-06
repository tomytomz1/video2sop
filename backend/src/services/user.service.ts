import { PrismaClient, User } from '@prisma/client';
import { AppError } from '../middleware/error';
import bcrypt from 'bcryptjs';
import { validateEnv } from '../utils/env';

const env = validateEnv();

export class UserService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    }
  ): Promise<User> {
    const user = await this.getUserById(id);

    // If updating email, check if it's already taken
    if (data.email && data.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new AppError('Email already in use', 400);
      }
    }

    // If updating password, verify current password
    if (data.newPassword) {
      if (!data.currentPassword) {
        throw new AppError('Current password is required', 400);
      }

      const isValidPassword = await bcrypt.compare(
        data.currentPassword,
        user.password
      );

      if (!isValidPassword) {
        throw new AppError('Current password is incorrect', 400);
      }

      // Hash new password
      data.newPassword = await bcrypt.hash(data.newPassword, 10);
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        password: data.newPassword,
      },
    });

    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.getUserById(id);

    // Delete user's data
    await Promise.all([
      this.prisma.job.deleteMany({ where: { userId: id } }),
      this.prisma.apiKey.deleteMany({ where: { userId: id } }),
      this.prisma.webhook.deleteMany({ where: { userId: id } }),
      this.prisma.shareableLink.deleteMany({
        where: { job: { userId: id } },
      }),
    ]);

    // Delete user
    await this.prisma.user.delete({ where: { id } });
  }

  async getUserApiKeys(id: string) {
    const user = await this.getUserById(id);

    return this.prisma.apiKey.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserWebhooks(id: string) {
    const user = await this.getUserById(id);

    return this.prisma.webhook.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserUsageStats(id: string) {
    const user = await this.getUserById(id);

    const [jobs, apiUsage, webhooks] = await Promise.all([
      this.prisma.job.findMany({
        where: { userId: id },
        select: {
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.apiUsage.findMany({
        where: { userId: id },
        select: {
          endpoint: true,
          statusCode: true,
          createdAt: true,
        },
      }),
      this.prisma.webhook.findMany({
        where: { userId: id },
        select: {
          deliveries: {
            select: {
              status: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    return {
      jobs: {
        total: jobs.length,
        byStatus: jobs.reduce((acc, job) => {
          acc[job.status] = (acc[job.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      apiUsage: {
        total: apiUsage.length,
        byEndpoint: apiUsage.reduce((acc, usage) => {
          acc[usage.endpoint] = (acc[usage.endpoint] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byStatusCode: apiUsage.reduce((acc, usage) => {
          acc[usage.statusCode] = (acc[usage.statusCode] || 0) + 1;
          return acc;
        }, {} as Record<number, number>),
      },
      webhooks: {
        total: webhooks.length,
        deliveries: webhooks.reduce((acc, webhook) => {
          webhook.deliveries.forEach((delivery) => {
            acc[delivery.status] = (acc[delivery.status] || 0) + 1;
          });
          return acc;
        }, {} as Record<string, number>),
      },
    };
  }
} 