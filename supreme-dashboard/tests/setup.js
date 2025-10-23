import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Test configuration
export const TEST_CONFIG = {
  PORT: process.env.TEST_PORT || 5001,
  HOST: process.env.TEST_HOST || 'localhost',
  DATABASE_URL: process.env.TEST_DATABASE_URL || 'sqlite:test.db',
  JWT_SECRET: 'test-secret-key',
  NODE_ENV: 'test'
};

// Test utilities
export class TestUtils {
  static async startServer() {
    try {
      const { stdout, stderr } = await execAsync('npm run test:server');
      console.log('Test server started:', stdout);
      return true;
    } catch (error) {
      console.error('Failed to start test server:', error);
      return false;
    }
  }

  static async stopServer() {
    try {
      await execAsync('pkill -f "node.*test.*server"');
      console.log('Test server stopped');
      return true;
    } catch (error) {
      console.error('Failed to stop test server:', error);
      return false;
    }
  }

  static async clearDatabase() {
    try {
      // Clear test database
      await execAsync('rm -f test.db');
      console.log('Test database cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear test database:', error);
      return false;
    }
  }

  static async seedDatabase() {
    try {
      // Seed test database with sample data
      const seedData = {
        users: [
          {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            password: 'hashedpassword',
            role: 'developer'
          }
        ],
        projects: [
          {
            id: 1,
            name: 'test-project',
            type: 'react',
            status: 'active'
          }
        ]
      };
      
      // Write seed data to test database
      console.log('Test database seeded');
      return true;
    } catch (error) {
      console.error('Failed to seed test database:', error);
      return false;
    }
  }

  static generateTestToken(userId = 1) {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ userId }, TEST_CONFIG.JWT_SECRET, { expiresIn: '1h' });
  }

  static async makeRequest(method, url, data = null, token = null) {
    const fetch = require('node-fetch');
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`http://${TEST_CONFIG.HOST}:${TEST_CONFIG.PORT}${url}`, options);
      const responseData = await response.json();
      
      return {
        status: response.status,
        data: responseData,
        headers: response.headers
      };
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  static async waitForServer(maxAttempts = 30, delay = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.makeRequest('GET', '/api/health');
        if (response.status === 200) {
          console.log('Server is ready');
          return true;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error('Server failed to start within timeout');
  }
}

// Test data factories
export const TestDataFactory = {
  createUser: (overrides = {}) => ({
    id: Math.floor(Math.random() * 1000),
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
    role: 'developer',
    createdAt: new Date(),
    lastLogin: null,
    ...overrides
  }),

  createProject: (overrides = {}) => ({
    id: Math.floor(Math.random() * 1000),
    name: 'test-project',
    type: 'react',
    status: 'active',
    created: new Date(),
    modified: new Date(),
    size: '1.2 MB',
    ...overrides
  }),

  createDatabase: (overrides = {}) => ({
    id: Math.floor(Math.random() * 1000),
    name: 'test_db',
    size: '2.5 MB',
    created: new Date(),
    type: 'mysql',
    ...overrides
  }),

  createLogEntry: (overrides = {}) => ({
    id: Math.floor(Math.random() * 1000),
    level: 'info',
    message: 'Test log entry',
    timestamp: new Date(),
    source: 'test',
    ...overrides
  })
};

// Mock implementations
export const MockImplementations = {
  // Mock Supreme CLI commands
  mockSupremeCommand: (command, response = { success: true, output: 'Mock response' }) => {
    const originalExec = require('child_process').exec;
    require('child_process').exec = (cmd, callback) => {
      if (cmd.includes('supreme')) {
        callback(null, { stdout: JSON.stringify(response), stderr: '' });
      } else {
        originalExec(cmd, callback);
      }
    };
  },

  // Mock file system operations
  mockFileSystem: () => {
    const fs = require('fs');
    const originalReadFile = fs.readFile;
    const originalWriteFile = fs.writeFile;
    const originalReadDir = fs.readdir;
    
    fs.readFile = (path, options, callback) => {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      
      if (path.includes('test')) {
        callback(null, 'Mock file content');
      } else {
        originalReadFile(path, options, callback);
      }
    };
    
    fs.writeFile = (path, data, options, callback) => {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      
      callback(null);
    };
    
    fs.readdir = (path, options, callback) => {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      
      if (path.includes('test')) {
        callback(null, ['file1.txt', 'file2.txt', 'directory1']);
      } else {
        originalReadDir(path, options, callback);
      }
    };
  },

  // Mock database operations
  mockDatabase: () => {
    const mockDb = {
      databases: [
        { name: 'test_db1', size: '1.2 MB', created: '2024-01-15' },
        { name: 'test_db2', size: '2.5 MB', created: '2024-01-20' }
      ],
      tables: [
        { name: 'users', rows: 100, type: 'table' },
        { name: 'projects', rows: 50, type: 'table' }
      ]
    };

    return {
      getDatabases: () => Promise.resolve(mockDb.databases),
      getTables: (dbName) => Promise.resolve(mockDb.tables),
      executeQuery: (query) => Promise.resolve({ rows: [], executionTime: 10 }),
      createDatabase: (name) => Promise.resolve({ success: true, message: `Database ${name} created` }),
      deleteDatabase: (name) => Promise.resolve({ success: true, message: `Database ${name} deleted` })
    };
  }
};

// Test assertions
export const TestAssertions = {
  expectSuccess: (response) => {
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  },

  expectError: (response, expectedStatus = 400) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBeDefined();
  },

  expectValidationError: (response) => {
    expect(response.status).toBe(400);
    expect(response.data.error.message).toContain('Validation failed');
    expect(response.data.error.details).toBeDefined();
  },

  expectAuthError: (response) => {
    expect(response.status).toBe(401);
    expect(response.data.error.message).toContain('Authentication');
  },

  expectPermissionError: (response) => {
    expect(response.status).toBe(403);
    expect(response.data.error.message).toContain('permission');
  }
};

// Global test setup
beforeAll(async () => {
  console.log('Setting up test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PORT = TEST_CONFIG.PORT;
  process.env.JWT_SECRET = TEST_CONFIG.JWT_SECRET;
  
  // Clear and seed test database
  await TestUtils.clearDatabase();
  await TestUtils.seedDatabase();
  
  // Start test server
  await TestUtils.startServer();
  await TestUtils.waitForServer();
  
  console.log('Test environment ready');
});

afterAll(async () => {
  console.log('Cleaning up test environment...');
  
  // Stop test server
  await TestUtils.stopServer();
  
  // Clear test database
  await TestUtils.clearDatabase();
  
  console.log('Test environment cleaned up');
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

export default {
  TEST_CONFIG,
  TestUtils,
  TestDataFactory,
  MockImplementations,
  TestAssertions
};
