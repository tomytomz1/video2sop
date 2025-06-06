import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../src/utils/logger';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

async function runMigrations() {
  try {
    logger.info('Starting database migration...');

    // Run Prisma migrations
    logger.info('Running Prisma migrations...');
    await execAsync('npx prisma migrate deploy');
    logger.info('Prisma migrations completed successfully');

    // Verify database schema
    logger.info('Verifying database schema...');
    await prisma.$queryRaw`
      DO $$
      DECLARE
        missing_columns text[];
      BEGIN
        -- Check User table columns
        SELECT array_agg(column_name) INTO missing_columns
        FROM (
          SELECT unnest(ARRAY['id', 'email', 'password', 'name', 'role', 'createdAt', 'updatedAt']) AS required_column
          EXCEPT
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'User'
        ) AS missing;

        IF array_length(missing_columns, 1) > 0 THEN
          RAISE EXCEPTION 'Missing columns in User table: %', array_to_string(missing_columns, ', ');
        END IF;

        -- Check Job table columns
        SELECT array_agg(column_name) INTO missing_columns
        FROM (
          SELECT unnest(ARRAY['id', 'status', 'type', 'input', 'output', 'error', 'progress', 'userId', 'createdAt', 'updatedAt', 'completedAt', 'metadata']) AS required_column
          EXCEPT
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'Job'
        ) AS missing;

        IF array_length(missing_columns, 1) > 0 THEN
          RAISE EXCEPTION 'Missing columns in Job table: %', array_to_string(missing_columns, ', ');
        END IF;

        -- Check indexes
        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE tablename = 'User'
          AND indexname = 'User_email_key'
        ) THEN
          RAISE EXCEPTION 'Missing unique index on User.email';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE tablename = 'Job'
          AND indexname = 'Job_status_idx'
        ) THEN
          RAISE EXCEPTION 'Missing index on Job.status';
        END IF;

        -- Add any missing indexes
        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE tablename = 'User'
          AND indexname = 'User_role_idx'
        ) THEN
          CREATE INDEX "User_role_idx" ON "User"("role");
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE tablename = 'User'
          AND indexname = 'User_createdAt_idx'
        ) THEN
          CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE tablename = 'Job'
          AND indexname = 'Job_type_idx'
        ) THEN
          CREATE INDEX "Job_type_idx" ON "Job"("type");
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE tablename = 'Job'
          AND indexname = 'Job_userId_idx'
        ) THEN
          CREATE INDEX "Job_userId_idx" ON "Job"("userId");
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE tablename = 'Job'
          AND indexname = 'Job_createdAt_idx'
        ) THEN
          CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE tablename = 'Job'
          AND indexname = 'Job_completedAt_idx'
        ) THEN
          CREATE INDEX "Job_completedAt_idx" ON "Job"("completedAt");
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE tablename = 'Job'
          AND indexname = 'Job_status_createdAt_idx'
        ) THEN
          CREATE INDEX "Job_status_createdAt_idx" ON "Job"("status", "createdAt");
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE tablename = 'Job'
          AND indexname = 'Job_userId_status_idx'
        ) THEN
          CREATE INDEX "Job_userId_status_idx" ON "Job"("userId", "status");
        END IF;
      END $$;
    `;
    logger.info('Database schema verification completed successfully');

    // Optimize database
    logger.info('Optimizing database...');
    await prisma.$queryRaw`
      -- Update statistics
      ANALYZE "User";
      ANALYZE "Job";

      -- Vacuum tables
      VACUUM ANALYZE "User";
      VACUUM ANALYZE "Job";
    `;
    logger.info('Database optimization completed successfully');

  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigrations(); 