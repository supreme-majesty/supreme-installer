import jwt from 'jsonwebtoken';
import { promisify } from 'util';

const JWT_SECRET = process.env.JWT_SECRET || 'supreme-dashboard-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Mock user database - In production, use a real database
const users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@supreme.dev',
    password: '$2b$10$rQZ8K9vL8xK9vL8xK9vL8u', // 'admin123' hashed
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    lastLogin: null
  },
  {
    id: 2,
    username: 'developer',
    email: 'dev@supreme.dev',
    password: '$2b$10$rQZ8K9vL8xK9vL8xK9vL8u', // 'dev123' hashed
    role: 'developer',
    createdAt: new Date('2024-01-01'),
    lastLogin: null
  }
];

export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = async (token) => {
  try {
    const decoded = await promisify(jwt.verify)(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const authenticateToken = async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return reply.code(401).send({ error: 'Access token required' });
    }

    const decoded = await verifyToken(token);
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return reply.code(401).send({ error: 'Invalid token' });
    }

    request.user = user;
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
};

export const requireRole = (roles) => {
  return async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
  };
};

export { users };
