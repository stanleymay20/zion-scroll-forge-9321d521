/**
 * Backup and Recovery Service
 * Handles automated backups and recovery procedures for production
 */

import { PrismaClient } from '@prisma/client';
// import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';
import { getProductionConfig } from '../config/production.config';

const execAsync = promisify(exec);

export interface BackupMetadata {
  id: string;
  type: 'database' | 'redis' | 'full';
  timestamp: Date;
  size: number;
  location: string;
  checksum: string;
  status: 'in_progress' | 'completed' | 'failed';
}

export interface RestoreOptions {
  backupId: string;
  targetEnvironment: 'production' | 'staging' | 'development';
  verifyIntegrity: boolean;
  createSnapshot: boolean;
}

export class BackupRecoveryService {
  private prisma: PrismaClient;
  private s3Client: any; // S3Client type - requires @aws-sdk/client-s3 package
  private config: ReturnType<typeof getProductionConfig>;

  constructor() {
    this.prisma = new PrismaClient();
    this.config = getProductionConfig();

    // S3 client initialization - requires @aws-sdk/client-s3 package
    // this.s3Client = new S3Client({
    //   region: process.env.AWS_REGION || 'us-east-1',
    //   credentials: {
    //     accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    //   },
    // });
  }

  /**
   * Create full system backup
   */
  async createFullBackup(): Promise<BackupMetadata> {
    const backupId = `full-${Date.now()}`;
    logger.info('Starting full system backup', { backupId });

    try {
      // Create database backup
      const dbBackup = await this.createDatabaseBackup();

      // Create Redis backup
      const redisBackup = await this.createRedisBackup();

      // Create metadata
      const metadata: BackupMetadata = {
        id: backupId,
        type: 'full',
        timestamp: new Date(),
        size: dbBackup.size + redisBackup.size,
        location: `s3://${this.config.backup.s3Bucket}/${backupId}`,
        checksum: this.generateChecksum([dbBackup.checksum, redisBackup.checksum]),
        status: 'completed',
      };

      // Store metadata
      await this.storeBackupMetadata(metadata);

      logger.info('Full system backup completed', { backupId, size: metadata.size });
      return metadata;
    } catch (error) {
      logger.error('Full system backup failed', { backupId, error });
      throw error;
    }
  }

  /**
   * Create database backup
   */
  async createDatabaseBackup(): Promise<BackupMetadata> {
    const backupId = `db-${Date.now()}`;
    logger.info('Starting database backup', { backupId });

    try {
      const databaseUrl = this.config.database.url;
      const backupFile = `/tmp/${backupId}.sql.gz`;

      // Extract database connection details
      const dbUrl = new URL(databaseUrl);
      const dbName = dbUrl.pathname.slice(1);
      const dbHost = dbUrl.hostname;
      const dbPort = dbUrl.port || '5432';
      const dbUser = dbUrl.username;
      const dbPassword = dbUrl.password;

      // Create PostgreSQL dump
      const dumpCommand = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F c -b -v -f ${backupFile}.tmp`;
      await execAsync(dumpCommand);

      // Compress backup
      await this.compressFile(`${backupFile}.tmp`, backupFile);

      // Upload to S3
      const s3Key = `backups/database/${backupId}.sql.gz`;
      await this.uploadToS3(backupFile, s3Key);

      // Get file size and checksum
      const { size, checksum } = await this.getFileInfo(backupFile);

      const metadata: BackupMetadata = {
        id: backupId,
        type: 'database',
        timestamp: new Date(),
        size,
        location: `s3://${this.config.backup.s3Bucket}/${s3Key}`,
        checksum,
        status: 'completed',
      };

      await this.storeBackupMetadata(metadata);

      logger.info('Database backup completed', { backupId, size });
      return metadata;
    } catch (error) {
      logger.error('Database backup failed', { backupId, error });
      throw error;
    }
  }

  /**
   * Create Redis backup
   */
  async createRedisBackup(): Promise<BackupMetadata> {
    const backupId = `redis-${Date.now()}`;
    logger.info('Starting Redis backup', { backupId });

    try {
      const backupFile = `/tmp/${backupId}.rdb.gz`;

      // Trigger Redis BGSAVE
      const redisUrl = new URL(this.config.redis.url);
      const saveCommand = `redis-cli -h ${redisUrl.hostname} -p ${redisUrl.port || 6379} BGSAVE`;
      await execAsync(saveCommand);

      // Wait for BGSAVE to complete
      await this.waitForRedisSave(redisUrl.hostname, redisUrl.port || '6379');

      // Copy and compress RDB file
      const rdbPath = '/var/lib/redis/dump.rdb';
      await this.compressFile(rdbPath, backupFile);

      // Upload to S3
      const s3Key = `backups/redis/${backupId}.rdb.gz`;
      await this.uploadToS3(backupFile, s3Key);

      // Get file size and checksum
      const { size, checksum } = await this.getFileInfo(backupFile);

      const metadata: BackupMetadata = {
        id: backupId,
        type: 'redis',
        timestamp: new Date(),
        size,
        location: `s3://${this.config.backup.s3Bucket}/${s3Key}`,
        checksum,
        status: 'completed',
      };

      await this.storeBackupMetadata(metadata);

      logger.info('Redis backup completed', { backupId, size });
      return metadata;
    } catch (error) {
      logger.error('Redis backup failed', { backupId, error });
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(options: RestoreOptions): Promise<void> {
    logger.info('Starting restore from backup', options);

    try {
      // Get backup metadata
      const metadata = await this.getBackupMetadata(options.backupId);

      if (!metadata) {
        throw new Error(`Backup not found: ${options.backupId}`);
      }

      // Verify integrity if requested
      if (options.verifyIntegrity) {
        await this.verifyBackupIntegrity(metadata);
      }

      // Create snapshot before restore if requested
      if (options.createSnapshot) {
        await this.createFullBackup();
      }

      // Restore based on backup type
      switch (metadata.type) {
        case 'database':
          await this.restoreDatabase(metadata);
          break;
        case 'redis':
          await this.restoreRedis(metadata);
          break;
        case 'full':
          await this.restoreDatabase(metadata);
          await this.restoreRedis(metadata);
          break;
      }

      logger.info('Restore completed successfully', options);
    } catch (error) {
      logger.error('Restore failed', { options, error });
      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups(type?: 'database' | 'redis' | 'full'): Promise<BackupMetadata[]> {
    try {
      // In production, this would use S3 ListObjectsV2Command
      // const prefix = type ? `backups/${type}/` : 'backups/';
      // const command = new ListObjectsV2Command({
      //   Bucket: this.config.backup.s3Bucket,
      //   Prefix: prefix,
      // });
      // const response = await this.s3Client.send(command);
      
      const backups: BackupMetadata[] = [];
      // Would populate from S3 response
      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      logger.error('Failed to list backups', { error });
      throw error;
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(): Promise<number> {
    logger.info('Starting backup cleanup');

    try {
      const backups = await this.listBackups();
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - this.config.backup.retentionDays);

      let deletedCount = 0;

      for (const backup of backups) {
        if (backup.timestamp < retentionDate) {
          await this.deleteBackup(backup.id);
          deletedCount++;
        }
      }

      logger.info('Backup cleanup completed', { deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('Backup cleanup failed', { error });
      throw error;
    }
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackupIntegrity(metadata: BackupMetadata): Promise<boolean> {
    logger.info('Verifying backup integrity', { backupId: metadata.id });

    try {
      // Download backup
      const s3Key = metadata.location.replace(`s3://${this.config.backup.s3Bucket}/`, '');
      const localFile = `/tmp/verify-${metadata.id}`;

      await this.downloadFromS3(s3Key, localFile);

      // Verify checksum
      const { checksum } = await this.getFileInfo(localFile);

      if (checksum !== metadata.checksum) {
        throw new Error('Backup integrity check failed: checksum mismatch');
      }

      logger.info('Backup integrity verified', { backupId: metadata.id });
      return true;
    } catch (error) {
      logger.error('Backup integrity verification failed', { backupId: metadata.id, error });
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  private async restoreDatabase(metadata: BackupMetadata): Promise<void> {
    logger.info('Restoring database', { backupId: metadata.id });

    try {
      const s3Key = metadata.location.replace(`s3://${this.config.backup.s3Bucket}/`, '');
      const localFile = `/tmp/restore-${metadata.id}.sql.gz`;

      // Download backup
      await this.downloadFromS3(s3Key, localFile);

      // Decompress
      const sqlFile = localFile.replace('.gz', '');
      await this.decompressFile(localFile, sqlFile);

      // Restore database
      const databaseUrl = this.config.database.url;
      const dbUrl = new URL(databaseUrl);
      const dbName = dbUrl.pathname.slice(1);
      const dbHost = dbUrl.hostname;
      const dbPort = dbUrl.port || '5432';
      const dbUser = dbUrl.username;
      const dbPassword = dbUrl.password;

      const restoreCommand = `PGPASSWORD="${dbPassword}" pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c ${sqlFile}`;
      await execAsync(restoreCommand);

      logger.info('Database restored successfully', { backupId: metadata.id });
    } catch (error) {
      logger.error('Database restore failed', { backupId: metadata.id, error });
      throw error;
    }
  }

  /**
   * Restore Redis from backup
   */
  private async restoreRedis(metadata: BackupMetadata): Promise<void> {
    logger.info('Restoring Redis', { backupId: metadata.id });

    try {
      const s3Key = metadata.location.replace(`s3://${this.config.backup.s3Bucket}/`, '');
      const localFile = `/tmp/restore-${metadata.id}.rdb.gz`;

      // Download backup
      await this.downloadFromS3(s3Key, localFile);

      // Decompress
      const rdbFile = localFile.replace('.gz', '');
      await this.decompressFile(localFile, rdbFile);

      // Stop Redis
      await execAsync('redis-cli SHUTDOWN NOSAVE');

      // Replace RDB file
      await execAsync(`cp ${rdbFile} /var/lib/redis/dump.rdb`);

      // Start Redis
      await execAsync('redis-server --daemonize yes');

      logger.info('Redis restored successfully', { backupId: metadata.id });
    } catch (error) {
      logger.error('Redis restore failed', { backupId: metadata.id, error });
      throw error;
    }
  }

  /**
   * Helper methods
   */

  private async compressFile(input: string, output: string): Promise<void> {
    const gzip = createGzip();
    const source = createReadStream(input);
    const destination = createWriteStream(output);

    await pipeline(source, gzip, destination);
  }

  private async decompressFile(input: string, output: string): Promise<void> {
    await execAsync(`gunzip -c ${input} > ${output}`);
  }

  private async uploadToS3(localFile: string, s3Key: string): Promise<void> {
    // In production, this would use S3 PutObjectCommand
    // const fileStream = createReadStream(localFile);
    // const command = new PutObjectCommand({
    //   Bucket: this.config.backup.s3Bucket,
    //   Key: s3Key,
    //   Body: fileStream,
    //   ServerSideEncryption: this.config.backup.encryption ? 'AES256' : undefined,
    // });
    // await this.s3Client.send(command);
    logger.info('Upload to S3 (placeholder)', { localFile, s3Key });
  }

  private async downloadFromS3(s3Key: string, localFile: string): Promise<void> {
    // In production, this would use S3 GetObjectCommand
    // const command = new GetObjectCommand({
    //   Bucket: this.config.backup.s3Bucket,
    //   Key: s3Key,
    // });
    // const response = await this.s3Client.send(command);
    // const fileStream = createWriteStream(localFile);
    // if (response.Body) {
    //   await pipeline(response.Body as any, fileStream);
    // }
    logger.info('Download from S3 (placeholder)', { s3Key, localFile });
  }

  private async getFileInfo(filePath: string): Promise<{ size: number; checksum: string }> {
    const { stdout: sizeOutput } = await execAsync(`stat -f%z ${filePath}`);
    const { stdout: checksumOutput } = await execAsync(`shasum -a 256 ${filePath}`);

    return {
      size: parseInt(sizeOutput.trim(), 10),
      checksum: checksumOutput.split(' ')[0],
    };
  }

  private generateChecksum(checksums: string[]): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(checksums.join(''));
    return hash.digest('hex');
  }

  private async waitForRedisSave(host: string, port: string): Promise<void> {
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      try {
        const { stdout } = await execAsync(`redis-cli -h ${host} -p ${port} LASTSAVE`);
        const lastSave = parseInt(stdout.trim(), 10);

        // Check if save is complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const { stdout: newStdout } = await execAsync(`redis-cli -h ${host} -p ${port} LASTSAVE`);
        const newLastSave = parseInt(newStdout.trim(), 10);

        if (newLastSave > lastSave) {
          return;
        }
      } catch (error) {
        logger.warn('Waiting for Redis save', { attempt: attempts });
      }

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error('Redis save timeout');
  }

  private async storeBackupMetadata(metadata: BackupMetadata): Promise<void> {
    // Store in database for tracking
    await this.prisma.$executeRaw`
      INSERT INTO backup_metadata (id, type, timestamp, size, location, checksum, status)
      VALUES (${metadata.id}, ${metadata.type}, ${metadata.timestamp}, ${metadata.size}, ${metadata.location}, ${metadata.checksum}, ${metadata.status})
    `;
  }

  private async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    const result = await this.prisma.$queryRaw<BackupMetadata[]>`
      SELECT * FROM backup_metadata WHERE id = ${backupId}
    `;

    return result[0] || null;
  }

  private async deleteBackup(backupId: string): Promise<void> {
    const metadata = await this.getBackupMetadata(backupId);

    if (metadata) {
      const s3Key = metadata.location.replace(`s3://${this.config.backup.s3Bucket}/`, '');

      // Delete from S3
      await this.s3Client.send({
        Bucket: this.config.backup.s3Bucket,
        Key: s3Key,
      } as any);

      // Delete metadata
      await this.prisma.$executeRaw`
        DELETE FROM backup_metadata WHERE id = ${backupId}
      `;
    }
  }
}

export default new BackupRecoveryService();
