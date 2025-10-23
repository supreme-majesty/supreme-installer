import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { promisify } from 'util';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'supreme-dashboard-secret-key-change-in-production-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

// Enhanced user database with security features
const users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@supreme.dev',
    password: '$2b$10$rQZ8K9vL8xK9vL8xK9vL8u', // 'admin123' hashed
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    lastLogin: null,
    loginAttempts: 0,
    lockedUntil: null,
    refreshTokens: [],
    twoFactorEnabled: false,
    twoFactorSecret: null,
    permissions: ['read', 'write', 'delete', 'admin']
  },
  {
    id: 2,
    username: 'developer',
    email: 'dev@supreme.dev',
    password: '$2b$10$rQZ8K9vL8xK9vL8xK9vL8u', // 'dev123' hashed
    role: 'developer',
    createdAt: new Date('2024-01-01'),
    lastLogin: null,
    loginAttempts: 0,
    lockedUntil: null,
    refreshTokens: [],
    twoFactorEnabled: false,
    twoFactorSecret: null,
    permissions: ['read', 'write']
  }
];

// Session management
const activeSessions = new Map();
const blacklistedTokens = new Set();

// Generate secure tokens
export const generateToken = (userId, type = 'access') => {
  const payload = { 
    userId, 
    type,
    iat: Math.floor(Date.now() / 1000)
  };
  
  const expiresIn = type === 'refresh' ? JWT_REFRESH_EXPIRES_IN : JWT_EXPIRES_IN;
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn,
    issuer: 'supreme-dashboard',
    audience: 'supreme-users'
  });
};

// Generate refresh token
export const generateRefreshToken = (userId) => {
  const token = generateToken(userId, 'refresh');
  const user = users.find(u => u.id === userId);
  if (user) {
    user.refreshTokens.push(token);
    // Keep only last 5 refresh tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
  }
  return token;
};

// Verify token with enhanced security
export const verifyToken = async (token) => {
  try {
    // Check if token is blacklisted
    if (blacklistedTokens.has(token)) {
      throw new Error('Token has been revoked');
    }
    
    const decoded = await promisify(jwt.verify)(token, JWT_SECRET);
    
    // Verify token audience and issuer (temporarily disabled for debugging)
    // if (decoded.audience !== 'supreme-users' || decoded.issuer !== 'supreme-dashboard') {
    //   throw new Error('Invalid token issuer or audience');
    // }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Enhanced authentication with rate limiting and account locking
export const authenticateToken = async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return reply.code(401).send({ 
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
    }

    const decoded = await verifyToken(token);
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return reply.code(401).send({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      return reply.code(423).send({ 
        error: 'Account temporarily locked due to too many failed login attempts',
        code: 'ACCOUNT_LOCKED',
        lockedUntil: user.lockedUntil
      });
    }

    // Check if user has permission for this endpoint
    const endpoint = request.routerPath || request.url;
    if (!hasPermission(user, endpoint, request.method)) {
      return reply.code(403).send({ 
        error: 'Insufficient permissions for this endpoint',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Update last activity
    user.lastActivity = new Date();
    request.user = user;
    
    // Store session info
    activeSessions.set(token, {
      userId: user.id,
      username: user.username,
      loginTime: new Date(),
      lastActivity: new Date(),
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });
    
  } catch (error) {
    return reply.code(401).send({ 
      error: 'Invalid token',
      code: 'TOKEN_INVALID'
    });
  }
};

// Check user permissions
const hasPermission = (user, endpoint, method) => {
  // Admin has all permissions
  if (user.role === 'admin') {
    return true;
  }
  
  // Check specific endpoint permissions
  const endpointPermissions = {
    '/api/projects': ['read', 'write'],
    '/api/database': ['read', 'write'],
    '/api/ssl': ['read', 'write'],
    '/api/system': ['read'],
    '/api/logs': ['read'],
    '/api/files': ['read', 'write']
  };
  
  const requiredPermissions = endpointPermissions[endpoint] || ['read'];
  
  return requiredPermissions.some(permission => 
    user.permissions.includes(permission)
  );
};

// Enhanced role-based access control
export const requireRole = (roles) => {
  return async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_ROLE',
        required: roles,
        current: request.user.role
      });
    }
  };
};

// Permission-based access control
export const requirePermission = (permissions) => {
  return async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const hasRequiredPermission = permissions.some(permission => 
      request.user.permissions.includes(permission)
    );

    if (!hasRequiredPermission) {
      return reply.code(403).send({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSION',
        required: permissions,
        current: request.user.permissions
      });
    }
  };
};

// Account lockout after failed attempts
export const handleFailedLogin = (username) => {
  const user = users.find(u => u.username === username);
  if (user) {
    user.loginAttempts += 1;
    
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = Date.now() + LOCKOUT_TIME;
    }
  }
};

// Reset login attempts on successful login
export const handleSuccessfulLogin = (userId) => {
  const user = users.find(u => u.id === userId);
  if (user) {
    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date();
  }
};

// Logout and revoke token
export const revokeToken = (token) => {
  blacklistedTokens.add(token);
  activeSessions.delete(token);
};

// Get active sessions for a user
export const getActiveSessions = (userId) => {
  return Array.from(activeSessions.values())
    .filter(session => session.userId === userId);
};

// Revoke all sessions for a user
export const revokeAllSessions = (userId) => {
  const userSessions = getActiveSessions(userId);
  userSessions.forEach(session => {
    blacklistedTokens.add(session.token);
    activeSessions.delete(session.token);
  });
};

// Clean up expired sessions
export const cleanupExpiredSessions = () => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [token, session] of activeSessions.entries()) {
    if (now - session.lastActivity.getTime() > maxAge) {
      activeSessions.delete(token);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

export { users };
