/**
 * Security Middleware Tests
 * "Test all things; hold fast what is good" - 1 Thessalonians 5:21
 */

import { Request, Response, NextFunction } from 'express';
import { 
  escapeHtml, 
  sanitizeString, 
  detectXSS 
} from '../xssProtection';
import { generateCSRFToken } from '../csrfProtection';
import securityService from '../../services/SecurityService';

describe('XSS Protection', () => {
  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("XSS")</script>';
      const output = escapeHtml(input);
      expect(output).not.toContain('<script>');
      expect(output).toContain('&lt;script&gt;');
    });
    
    it('should escape quotes', () => {
      const input = 'Hello "World"';
      const output = escapeHtml(input);
      expect(output).toContain('&quot;');
    });
  });
  
  describe('sanitizeString', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert(1)</script> World';
      const output = sanitizeString(input);
      expect(output).not.toContain('<script>');
    });
    
    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const output = sanitizeString(input);
      expect(output).not.toContain('onclick');
    });
    
    it('should truncate long strings', () => {
      const input = 'a'.repeat(20000);
      const output = sanitizeString(input, { maxLength: 1000 });
      expect(output.length).toBe(1000);
    });
  });
  
  describe('detectXSS', () => {
    it('should detect script tags', () => {
      expect(detectXSS('<script>alert(1)</script>')).toBe(true);
    });
    
    it('should detect javascript protocol', () => {
      expect(detectXSS('javascript:alert(1)')).toBe(true);
    });
    
    it('should detect event handlers', () => {
      expect(detectXSS('onerror=alert(1)')).toBe(true);
    });
    
    it('should not flag safe content', () => {
      expect(detectXSS('Hello World')).toBe(false);
    });
  });
});

describe('CSRF Protection', () => {
  describe('generateCSRFToken', () => {
    it('should generate a token', () => {
      const token = generateCSRFToken();
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
    });
    
    it('should generate unique tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(token1).not.toBe(token2);
    });
    
    it('should generate hex tokens', () => {
      const token = generateCSRFToken();
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });
  });
});

describe('Security Service', () => {
  describe('validatePassword', () => {
    it('should accept strong passwords', () => {
      const result = securityService.validatePassword('StrongP@ss123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject short passwords', () => {
      const result = securityService.validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('at least'))).toBe(true);
    });
    
    it('should reject passwords without uppercase', () => {
      const result = securityService.validatePassword('weakpass123!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('uppercase'))).toBe(true);
    });
    
    it('should reject passwords without numbers', () => {
      const result = securityService.validatePassword('WeakPassword!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('number'))).toBe(true);
    });
    
    it('should reject passwords without special characters', () => {
      const result = securityService.validatePassword('WeakPassword123');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('special'))).toBe(true);
    });
    
    it('should reject common passwords', () => {
      const result = securityService.validatePassword('Password123!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('common'))).toBe(true);
    });
  });
  
  describe('generateSecureToken', () => {
    it('should generate a token', () => {
      const token = securityService.generateSecureToken();
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
    });
    
    it('should generate tokens of specified length', () => {
      const token = securityService.generateSecureToken(16);
      expect(token.length).toBe(32); // 16 bytes = 32 hex characters
    });
  });
  
  describe('generateAPIKey', () => {
    it('should generate an API key with prefix', () => {
      const apiKey = securityService.generateAPIKey();
      expect(apiKey).toMatch(/^scroll_/);
    });
    
    it('should generate unique API keys', () => {
      const key1 = securityService.generateAPIKey();
      const key2 = securityService.generateAPIKey();
      expect(key1).not.toBe(key2);
    });
  });
  
  describe('detectSQLInjection', () => {
    it('should detect SELECT statements', () => {
      expect(securityService.detectSQLInjection('SELECT * FROM users')).toBe(true);
    });
    
    it('should detect UNION attacks', () => {
      expect(securityService.detectSQLInjection('1 UNION SELECT password FROM users')).toBe(true);
    });
    
    it('should detect SQL comments', () => {
      expect(securityService.detectSQLInjection("admin' --")).toBe(true);
    });
    
    it('should detect OR conditions', () => {
      expect(securityService.detectSQLInjection("1' OR '1'='1")).toBe(true);
    });
    
    it('should not flag safe content', () => {
      expect(securityService.detectSQLInjection('john@example.com')).toBe(false);
    });
  });
  
  describe('isValidIP', () => {
    it('should validate IPv4 addresses', () => {
      expect(securityService.isValidIP('192.168.1.1')).toBe(true);
      expect(securityService.isValidIP('10.0.0.1')).toBe(true);
    });
    
    it('should reject invalid IPv4 addresses', () => {
      expect(securityService.isValidIP('256.1.1.1')).toBe(false);
      expect(securityService.isValidIP('192.168.1')).toBe(false);
    });
    
    it('should validate IPv6 addresses', () => {
      expect(securityService.isValidIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    });
  });
  
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data', () => {
      const original = 'sensitive data';
      const encrypted = securityService.encrypt(original);
      const decrypted = securityService.decrypt(encrypted);
      
      expect(encrypted).not.toBe(original);
      expect(decrypted).toBe(original);
    });
    
    it('should produce different ciphertext for same input', () => {
      const data = 'test data';
      const encrypted1 = securityService.encrypt(data);
      const encrypted2 = securityService.encrypt(data);
      
      expect(encrypted1).not.toBe(encrypted2);
    });
  });
});

describe('Password Hashing', () => {
  it('should hash passwords', async () => {
    const password = 'TestPassword123!';
    const hash = await securityService.hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
  });
  
  it('should verify correct passwords', async () => {
    const password = 'TestPassword123!';
    const hash = await securityService.hashPassword(password);
    const isValid = await securityService.verifyPassword(password, hash);
    
    expect(isValid).toBe(true);
  });
  
  it('should reject incorrect passwords', async () => {
    const password = 'TestPassword123!';
    const hash = await securityService.hashPassword(password);
    const isValid = await securityService.verifyPassword('WrongPassword123!', hash);
    
    expect(isValid).toBe(false);
  });
});
