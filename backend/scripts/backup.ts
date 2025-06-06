import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import logger from '../src/utils/logger';
import { validateEnv } from '../src/utils/env';

const execAsync = promisify(exec);
const prisma = new PrismaClient();
const env = validateEnv();

interface BackupConfig {
  backupDir: string;
  retentionDays: number;
  compress: boolean;
  encrypt: boolean;
}

const configs: Record<string, BackupConfig> = {
  development: {
    backupDir: path.join(__dirname, '../backups/dev'),
    retentionDays: 7,
    compress: true,
    encrypt: false
  },
  staging: {
    backupDir: path.join(__dirname, '../backups/staging'),
    retentionDays: 30,
    compress: true,
    encrypt: true
  },
  production: {
    backupDir: path.join(__dirname, '../backups/prod'),
    retentionDays: 90,
    compress: true,
    encrypt: true
  }
};

async function createBackup(config: BackupConfig) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(config.backupDir, `backup-${timestamp}.sql`);
  const compressedPath = `${backupPath}.gz`;
  const encryptedPath = `${backupPath}.gz.enc`;

  try {
    // Ensure backup directory exists
    await fs.promises.mkdir(config.backupDir, { recursive: true });

    // Create backup
    logger.info('Creating database backup...');
    const { stdout, stderr } = await execAsync(
      `PGPASSWORD=${env.POSTGRES_PASSWORD} pg_dump -h localhost -U ${env.POSTGRES_USER} -d ${env.POSTGRES_DB} -F p -f ${backupPath}`
    );

    if (stderr) {
      logger.warn('Backup warnings:', stderr);
    }

    // Compress backup
    if (config.compress) {
      logger.info('Compressing backup...');
      await execAsync(`gzip ${backupPath}`);
    }

    // Encrypt backup
    if (config.encrypt) {
      logger.info('Encrypting backup...');
      await execAsync(
        `gpg --encrypt --recipient ${env.BACKUP_ENCRYPTION_KEY} --output ${encryptedPath} ${compressedPath}`
      );
      // Remove unencrypted backup
      await fs.promises.unlink(compressedPath);
    }

    logger.info('Backup completed successfully');

    // Cleanup old backups
    await cleanupOldBackups(config);

  } catch (error) {
    logger.error('Backup failed:', error);
    process.exit(1);
  }
}

async function cleanupOldBackups(config: BackupConfig) {
  try {
    const files = await fs.promises.readdir(config.backupDir);
    const now = new Date();

    for (const file of files) {
      const filePath = path.join(config.backupDir, file);
      const stats = await fs.promises.stat(filePath);
      const daysOld = (now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

      if (daysOld > config.retentionDays) {
        logger.info(`Removing old backup: ${file}`);
        await fs.promises.unlink(filePath);
      }
    }
  } catch (error) {
    logger.error('Cleanup failed:', error);
  }
}

// Production backup best practices:
/*
1. Use a dedicated backup server or cloud storage
2. Implement point-in-time recovery (PITR)
3. Test backup restoration regularly
4. Use incremental backups for large databases
5. Implement backup monitoring and alerts
6. Use multiple backup locations
7. Implement backup encryption
8. Regular backup verification
9. Document backup and restore procedures
10. Implement backup retention policies
*/

async function main() {
  const environment = process.env.NODE_ENV || 'development';
  const config = configs[environment];

  if (!config) {
    logger.error(`Invalid environment: ${environment}`);
    process.exit(1);
  }

  await createBackup(config);
  await prisma.$disconnect();
}

main(); 