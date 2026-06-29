/**
 * Secure File Upload Middleware
 * File validation, virus scanning, and secure storage
 * "Test everything; hold fast what is good" - 1 Thessalonians 5:21
 */

import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import fs from 'fs/promises';

/**
 * Allowed file types and their MIME types
 */
const ALLOWED_FILE_TYPES: { [key: string]: string[] } = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],
  videos: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
};

/**
 * Maximum file sizes (in bytes)
 */
const MAX_FILE_SIZES: { [key: string]: number } = {
  image: 5 * 1024 * 1024,      // 5MB
  document: 10 * 1024 * 1024,  // 10MB
  video: 100 * 1024 * 1024,    // 100MB
  audio: 10 * 1024 * 1024,     // 10MB
  default: 10 * 1024 * 1024    // 10MB
};

/**
 * Dangerous file extensions to block
 */
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
  '.jar', '.msi', '.app', '.deb', '.rpm', '.dmg', '.pkg', '.sh'
];

/**
 * File signature (magic numbers) for validation
 */
const FILE_SIGNATURES: { [key: string]: Buffer[] } = {
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
  'application/zip': [Buffer.from([0x50, 0x4B, 0x03, 0x04])],
  'video/mp4': [Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70])]
};

/**
 * Generate secure filename
 */
function generateSecureFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
}

/**
 * Validate file extension
 */
function validateExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return !BLOCKED_EXTENSIONS.includes(ext);
}

/**
 * Validate file signature (magic numbers)
 */
async function validateFileSignature(filePath: string, mimeType: string): Promise<boolean> {
  try {
    const signatures = FILE_SIGNATURES[mimeType];
    if (!signatures) {
      return true; // No signature validation for this type
    }
    
    const fileHandle = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(8);
    await fileHandle.read(buffer, 0, 8, 0);
    await fileHandle.close();
    
    return signatures.some(signature => 
      buffer.slice(0, signature.length).equals(signature)
    );
  } catch (error) {
    logger.error('File signature validation error', { error: error.message, filePath });
    return false;
  }
}

/**
 * Simple virus scanning using pattern matching
 * In production, integrate with ClamAV or similar
 */
async function scanForVirus(filePath: string): Promise<{ safe: boolean; threat?: string }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8').catch(() => '');
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /system\s*\(/gi,
      /shell_exec/gi,
      /base64_decode/gi,
      /<script/gi,
      /javascript:/gi,
      /vbscript:/gi
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        return {
          safe: false,
          threat: 'Suspicious code pattern detected'
        };
      }
    }
    
    return { safe: true };
  } catch (error) {
    // If we can't read as text, assume it's binary and safe
    return { safe: true };
  }
}

/**
 * Configure multer storage
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const secureFilename = generateSecureFilename(file.originalname);
    cb(null, secureFilename);
  }
});

/**
 * File filter for multer
 */
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Validate extension
  if (!validateExtension(file.originalname)) {
    logger.warn('Blocked file extension', {
      filename: file.originalname,
      userId: req.user?.id,
      ip: req.ip
    });
    return cb(new Error('File type not allowed'));
  }
  
  // Validate MIME type
  const allAllowedTypes = Object.values(ALLOWED_FILE_TYPES).flat();
  if (!allAllowedTypes.includes(file.mimetype)) {
    logger.warn('Blocked MIME type', {
      filename: file.originalname,
      mimetype: file.mimetype,
      userId: req.user?.id,
      ip: req.ip
    });
    return cb(new Error('File type not allowed'));
  }
  
  cb(null, true);
};

/**
 * Create multer upload middleware
 */
export function createUploadMiddleware(options: {
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
} = {}) {
  const {
    maxFiles = 5,
    maxFileSize = MAX_FILE_SIZES.default,
    allowedTypes = Object.values(ALLOWED_FILE_TYPES).flat()
  } = options;
  
  return multer({
    storage,
    fileFilter: (req, file, cb) => {
      if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error('File type not allowed'));
      }
      fileFilter(req, file, cb);
    },
    limits: {
      fileSize: maxFileSize,
      files: maxFiles
    }
  });
}

/**
 * Post-upload validation middleware
 */
export function validateUploadedFiles(req: Request, res: Response, next: NextFunction): void {
  if (!req.file && !req.files) {
    return next();
  }
  
  const files = req.file ? [req.file] : (req.files as Express.Multer.File[] || []);
  
  // Validate each file
  Promise.all(files.map(async (file) => {
    // Validate file signature
    const signatureValid = await validateFileSignature(file.path, file.mimetype);
    if (!signatureValid) {
      await fs.unlink(file.path).catch(() => {});
      throw new Error(`Invalid file signature for ${file.originalname}`);
    }
    
    // Scan for viruses
    const scanResult = await scanForVirus(file.path);
    if (!scanResult.safe) {
      await fs.unlink(file.path).catch(() => {});
      logger.warn('Virus detected in upload', {
        filename: file.originalname,
        threat: scanResult.threat,
        userId: req.user?.id,
        ip: req.ip
      });
      throw new Error('File failed security scan');
    }
    
    return true;
  }))
  .then(() => {
    logger.info('Files uploaded successfully', {
      count: files.length,
      userId: req.user?.id
    });
    next();
  })
  .catch((error) => {
    logger.error('File validation failed', {
      error: error.message,
      userId: req.user?.id
    });
    
    res.status(400).json({
      success: false,
      error: error.message
    });
  });
}

/**
 * Secure file download middleware
 */
export function secureFileDownload(req: Request, res: Response, next: NextFunction): void {
  // Prevent path traversal
  const filename = path.basename(req.params.filename || '');
  
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    logger.warn('Path traversal attempt', {
      filename: req.params.filename,
      userId: req.user?.id,
      ip: req.ip
    });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid filename'
    });
  }
  
  // Set secure headers for download
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  next();
}

/**
 * Clean up old uploaded files
 */
export async function cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
  try {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const files = await fs.readdir(uploadDir);
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    
    for (const file of files) {
      const filePath = path.join(uploadDir, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath);
        logger.info('Cleaned up old file', { file });
      }
    }
  } catch (error) {
    logger.error('File cleanup error', { error: error.message });
  }
}

/**
 * Image upload middleware
 */
export const imageUpload = createUploadMiddleware({
  maxFiles: 5,
  maxFileSize: MAX_FILE_SIZES.image,
  allowedTypes: ALLOWED_FILE_TYPES.images
});

/**
 * Document upload middleware
 */
export const documentUpload = createUploadMiddleware({
  maxFiles: 10,
  maxFileSize: MAX_FILE_SIZES.document,
  allowedTypes: ALLOWED_FILE_TYPES.documents
});

/**
 * Video upload middleware
 */
export const videoUpload = createUploadMiddleware({
  maxFiles: 1,
  maxFileSize: MAX_FILE_SIZES.video,
  allowedTypes: ALLOWED_FILE_TYPES.videos
});

export default {
  createUploadMiddleware,
  validateUploadedFiles,
  secureFileDownload,
  cleanupOldFiles,
  imageUpload,
  documentUpload,
  videoUpload
};
