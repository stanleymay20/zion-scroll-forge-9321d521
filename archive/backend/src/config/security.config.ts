/**
 * Security Configuration
 * Centralized security settings for the application
 * "The Lord is my rock, my fortress and my deliverer" - Psalm 18:2
 */

export interface SecurityConfig {
  // CSRF Protection
  csrf: {
    enabled: boolean;
    tokenLength: number;
    tokenExpiration: number; // milliseconds
    cookieName: string;
    headerName: string;
  };
  
  // XSS Protection
  xss: {
    enabled: boolean;
    allowHtml: boolean;
    strictMode: boolean;
    maxInputLength: number;
  };
  
  // Rate Limiting
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    
    // Endpoint-specific limits
    auth: {
      windowMs: number;
      maxRequests: number;
    };
    api: {
      windowMs: number;
      maxRequests: number;
    };
    ai: {
      windowMs: number;
      maxRequests: number;
    };
    upload: {
      windowMs: number;
      maxRequests: number;
    };
    payment: {
      windowMs: number;
      maxRequests: number;
    };
  };
  
  // File Upload Security
  fileUpload: {
    enabled: boolean;
    maxFileSize: number; // bytes
    maxFiles: number;
    allowedMimeTypes: string[];
    blockedExtensions: string[];
    virusScanEnabled: boolean;
    validateSignature: boolean;
  };
  
  // SQL Injection Prevention
  sqlInjection: {
    enabled: boolean;
    useParameterizedQueries: boolean;
    validateInput: boolean;
  };
  
  // Audit Logging
  auditLog: {
    enabled: boolean;
    logAuthentication: boolean;
    logDataAccess: boolean;
    logFinancialOps: boolean;
    logConfigChanges: boolean;
    logSecurityViolations: boolean;
    retentionDays: number;
  };
  
  // Session Security
  session: {
    secret: string;
    cookieName: string;
    maxAge: number; // milliseconds
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
  
  // Password Policy
  password: {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventCommon: boolean;
    maxAge: number; // days
  };
  
  // JWT Configuration
  jwt: {
    accessTokenExpiration: string;
    refreshTokenExpiration: string;
    algorithm: string;
    issuer: string;
  };
  
  // CORS Configuration
  cors: {
    enabled: boolean;
    origins: string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
  };
  
  // Security Headers
  headers: {
    hsts: {
      enabled: boolean;
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    csp: {
      enabled: boolean;
      directives: { [key: string]: string[] };
    };
    xFrameOptions: string;
    xContentTypeOptions: boolean;
    referrerPolicy: string;
  };
}

/**
 * Get security configuration based on environment
 */
export function getSecurityConfig(): SecurityConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    csrf: {
      enabled: true,
      tokenLength: 32,
      tokenExpiration: 60 * 60 * 1000, // 1 hour
      cookieName: 'XSRF-TOKEN',
      headerName: 'X-CSRF-Token'
    },
    
    xss: {
      enabled: true,
      allowHtml: false,
      strictMode: isProduction,
      maxInputLength: 10000
    },
    
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      skipSuccessfulRequests: false,
      
      auth: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 5
      },
      api: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 100
      },
      ai: {
        windowMs: 60 * 1000,
        maxRequests: 10
      },
      upload: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 20
      },
      payment: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 10
      }
    },
    
    fileUpload: {
      enabled: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      blockedExtensions: [
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'
      ],
      virusScanEnabled: true,
      validateSignature: true
    },
    
    sqlInjection: {
      enabled: true,
      useParameterizedQueries: true,
      validateInput: true
    },
    
    auditLog: {
      enabled: true,
      logAuthentication: true,
      logDataAccess: true,
      logFinancialOps: true,
      logConfigChanges: true,
      logSecurityViolations: true,
      retentionDays: 90
    },
    
    session: {
      secret: process.env.SESSION_SECRET || 'scroll-university-secret-key',
      cookieName: 'scroll.sid',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: isProduction,
      httpOnly: true,
      sameSite: 'strict'
    },
    
    password: {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventCommon: true,
      maxAge: 90 // days
    },
    
    jwt: {
      accessTokenExpiration: '15m',
      refreshTokenExpiration: '7d',
      algorithm: 'HS256',
      issuer: 'scroll-university'
    },
    
    cors: {
      enabled: true,
      origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
    },
    
    headers: {
      hsts: {
        enabled: isProduction,
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      csp: {
        enabled: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: ["'self'", 'https://api.openai.com', 'https://api.anthropic.com'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"]
        }
      },
      xFrameOptions: 'DENY',
      xContentTypeOptions: true,
      referrerPolicy: 'strict-origin-when-cross-origin'
    }
  };
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(config: SecurityConfig): boolean {
  // Check required environment variables
  const requiredEnvVars = [
    'JWT_SECRET',
    'SESSION_SECRET'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`);
      return false;
    }
  }
  
  // Validate password policy
  if (config.password.minLength < 8) {
    console.error('Password minimum length must be at least 8 characters');
    return false;
  }
  
  // Validate rate limits
  if (config.rateLimit.maxRequests < 1) {
    console.error('Rate limit max requests must be at least 1');
    return false;
  }
  
  return true;
}

export default {
  getSecurityConfig,
  validateSecurityConfig
};
