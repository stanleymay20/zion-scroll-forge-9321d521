/**
 * Security Service
 * Comprehensive security management for ScrollUniversity
 * "The Lord is my rock, my fortress and my deliverer" - Psalm 18:2
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { getSecurityConfig } from '../config/security.config';
import { createAuditLog, AuditEventType } from '../middleware/auditLogging';

const prisma = new PrismaClient();

export class SecurityService {
  private config = getSecurityConfig();
  
  /**
   * Hash password using bcrypt-compatible algorithm
   */
  async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }
  
  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(password, hash);
  }
  
  /**
   * Validate password against policy
   */
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const policy = this.config.password;
    
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters`);
    }
    
    if (password.length > policy.maxLength) {
      errors.push(`Password must be less than ${policy.maxLength} characters`);
    }
    
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Check against common passwords
    if (policy.preventCommon && this.isCommonPassword(password)) {
      errors.push('Password is too common, please choose a stronger password');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Check if password is in common password list
   */
  private isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', '12345678', 'qwerty', 'abc123',
      'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
      'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
      'bailey', 'passw0rd', 'shadow', '123123', '654321'
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }
  
  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
  
  /**
   * Generate API key
   */
  generateAPIKey(): string {
    const prefix = 'scroll_';
    const key = crypto.randomBytes(32).toString('base64url');
    return `${prefix}${key}`;
  }
  
  /**
   * Hash API key for storage
   */
  hashAPIKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
  
  /**
   * Verify API key
   */
  async verifyAPIKey(apiKey: string): Promise<boolean> {
    const hash = this.hashAPIKey(apiKey);
    // In production, check against database
    return true; // Placeholder
  }
  
  /**
   * Encrypt sensitive data
   */
  encrypt(data: string, key?: string): string {
    const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-key';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32)),
      iv
    );
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }
  
  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string, key?: string): string {
    const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-key';
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32)),
      iv
    );
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * Check for SQL injection patterns
   */
  detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /(UNION\s+SELECT)/i,
      /(--|\#|\/\*|\*\/)/,
      /(\bOR\b\s+\d+\s*=\s*\d+)/i,
      /(\bAND\b\s+\d+\s*=\s*\d+)/i,
      /(;|\||&&)/
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }
  
  /**
   * Sanitize SQL input (use Prisma instead!)
   */
  sanitizeSQLInput(input: string): string {
    // This is a fallback - always use Prisma parameterized queries
    return input.replace(/['";\\]/g, '');
  }
  
  /**
   * Validate IP address
   */
  isValidIP(ip: string): boolean {
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
  }
  
  /**
   * Check if IP is in blacklist
   */
  async isIPBlacklisted(ip: string): Promise<boolean> {
    // In production, check against database or external service
    const blacklistedIPs = process.env.BLACKLISTED_IPS?.split(',') || [];
    return blacklistedIPs.includes(ip);
  }
  
  /**
   * Add IP to blacklist
   */
  async blacklistIP(ip: string, reason: string): Promise<void> {
    logger.warn('IP blacklisted', { ip, reason });
    
    await createAuditLog({
      eventType: AuditEventType.SECURITY_VIOLATION,
      action: 'IP_BLACKLISTED',
      details: { ip, reason },
      ipAddress: ip,
      success: true
    });
  }
  
  /**
   * Generate TOTP secret for 2FA
   */
  generate2FASecret(): string {
    return crypto.randomBytes(20).toString('base64');
  }
  
  /**
   * Verify TOTP token
   */
  verify2FAToken(secret: string, token: string): boolean {
    // In production, use speakeasy or similar library
    // This is a placeholder
    return token.length === 6 && /^\d+$/.test(token);
  }
  
  /**
   * Check for brute force attempts
   */
  async checkBruteForce(identifier: string, action: string): Promise<boolean> {
    const key = `bruteforce:${action}:${identifier}`;
    const attempts = await this.getAttemptCount(key);
    
    const maxAttempts = 5;
    const windowMs = 15 * 60 * 1000; // 15 minutes
    
    if (attempts >= maxAttempts) {
      logger.warn('Brute force detected', { identifier, action, attempts });
      
      await createAuditLog({
        eventType: AuditEventType.SECURITY_VIOLATION,
        action: 'BRUTE_FORCE_DETECTED',
        details: { identifier, action, attempts },
        success: false
      });
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Record failed attempt
   */
  async recordFailedAttempt(identifier: string, action: string): Promise<void> {
    const key = `bruteforce:${action}:${identifier}`;
    await this.incrementAttemptCount(key);
  }
  
  /**
   * Clear failed attempts
   */
  async clearFailedAttempts(identifier: string, action: string): Promise<void> {
    const key = `bruteforce:${action}:${identifier}`;
    await this.resetAttemptCount(key);
  }
  
  /**
   * Get attempt count (placeholder - use Redis in production)
   */
  private async getAttemptCount(key: string): Promise<number> {
    // In production, use Redis
    return 0;
  }
  
  /**
   * Increment attempt count (placeholder - use Redis in production)
   */
  private async incrementAttemptCount(key: string): Promise<void> {
    // In production, use Redis with expiration
  }
  
  /**
   * Reset attempt count (placeholder - use Redis in production)
   */
  private async resetAttemptCount(key: string): Promise<void> {
    // In production, use Redis
  }
  
  /**
   * Generate secure session ID
   */
  generateSessionID(): string {
    return crypto.randomBytes(32).toString('base64url');
  }
  
  /**
   * Validate session
   */
  async validateSession(sessionId: string): Promise<boolean> {
    // In production, check against Redis or database
    return sessionId.length > 0;
  }
  
  /**
   * Get security metrics
   */
  async getSecurityMetrics(startDate: Date, endDate: Date): Promise<any> {
    const [
      totalViolations,
      failedLogins,
      suspiciousActivity,
      blockedIPs
    ] = await Promise.all([
      prisma.auditLog.count({
        where: {
          eventType: AuditEventType.SECURITY_VIOLATION,
          timestamp: { gte: startDate, lte: endDate }
        }
      }),
      prisma.auditLog.count({
        where: {
          eventType: AuditEventType.LOGIN_FAILED,
          timestamp: { gte: startDate, lte: endDate }
        }
      }),
      prisma.auditLog.count({
        where: {
          eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
          timestamp: { gte: startDate, lte: endDate }
        }
      }),
      prisma.auditLog.count({
        where: {
          action: 'IP_BLACKLISTED',
          timestamp: { gte: startDate, lte: endDate }
        }
      })
    ]);
    
    return {
      totalViolations,
      failedLogins,
      suspiciousActivity,
      blockedIPs,
      period: {
        start: startDate,
        end: endDate
      }
    };
  }
}

export default new SecurityService();
