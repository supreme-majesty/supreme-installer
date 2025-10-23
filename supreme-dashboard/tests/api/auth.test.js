import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { TestUtils, TestDataFactory, TestAssertions } from '../setup.js';

describe('Authentication API', () => {
  let testUser;
  let authToken;

  beforeEach(() => {
    testUser = TestDataFactory.createUser({
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpassword123'
    });
  });

  afterEach(() => {
    authToken = null;
  });

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const response = await TestUtils.makeRequest('POST', '/api/auth/login', {
        username: 'admin',
        password: 'admin123'
      });

      TestAssertions.expectSuccess(response);
      expect(response.data.token).toBeDefined();
      expect(response.data.user).toBeDefined();
      expect(response.data.user.username).toBe('admin');
    });

    test('should reject invalid credentials', async () => {
      const response = await TestUtils.makeRequest('POST', '/api/auth/login', {
        username: 'admin',
        password: 'wrongpassword'
      });

      TestAssertions.expectError(response, 401);
      expect(response.data.error.message).toContain('Invalid credentials');
    });

    test('should reject empty credentials', async () => {
      const response = await TestUtils.makeRequest('POST', '/api/auth/login', {
        username: '',
        password: ''
      });

      TestAssertions.expectValidationError(response);
    });

    test('should reject malformed credentials', async () => {
      const response = await TestUtils.makeRequest('POST', '/api/auth/login', {
        username: 'a', // Too short
        password: '123' // Too short
      });

      TestAssertions.expectValidationError(response);
    });

    test('should handle account lockout after multiple failed attempts', async () => {
      // Simulate multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await TestUtils.makeRequest('POST', '/api/auth/login', {
          username: 'admin',
          password: 'wrongpassword'
        });
      }

      const response = await TestUtils.makeRequest('POST', '/api/auth/login', {
        username: 'admin',
        password: 'admin123'
      });

      expect(response.status).toBe(423);
      expect(response.data.error.message).toContain('Account temporarily locked');
    });
  });

  describe('POST /api/auth/register', () => {
    test('should register new user with valid data', async () => {
      const response = await TestUtils.makeRequest('POST', '/api/auth/register', {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'newpassword123',
        confirmPassword: 'newpassword123'
      });

      TestAssertions.expectSuccess(response);
      expect(response.data.token).toBeDefined();
      expect(response.data.user.username).toBe('newuser');
    });

    test('should reject duplicate username', async () => {
      const response = await TestUtils.makeRequest('POST', '/api/auth/register', {
        username: 'admin', // Already exists
        email: 'newuser@example.com',
        password: 'newpassword123',
        confirmPassword: 'newpassword123'
      });

      TestAssertions.expectValidationError(response);
      expect(response.data.error.details.username).toContain('already exists');
    });

    test('should reject duplicate email', async () => {
      const response = await TestUtils.makeRequest('POST', '/api/auth/register', {
        username: 'newuser',
        email: 'admin@supreme.dev', // Already exists
        password: 'newpassword123',
        confirmPassword: 'newpassword123'
      });

      TestAssertions.expectValidationError(response);
      expect(response.data.error.details.email).toContain('already exists');
    });

    test('should reject mismatched passwords', async () => {
      const response = await TestUtils.makeRequest('POST', '/api/auth/register', {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'newpassword123',
        confirmPassword: 'differentpassword'
      });

      TestAssertions.expectValidationError(response);
      expect(response.data.error.details.confirmPassword).toContain('do not match');
    });

    test('should reject weak passwords', async () => {
      const response = await TestUtils.makeRequest('POST', '/api/auth/register', {
        username: 'newuser',
        email: 'newuser@example.com',
        password: '123', // Too weak
        confirmPassword: '123'
      });

      TestAssertions.expectValidationError(response);
      expect(response.data.error.details.password).toContain('at least 6 characters');
    });

    test('should reject invalid email format', async () => {
      const response = await TestUtils.makeRequest('POST', '/api/auth/register', {
        username: 'newuser',
        email: 'invalid-email',
        password: 'newpassword123',
        confirmPassword: 'newpassword123'
      });

      TestAssertions.expectValidationError(response);
      expect(response.data.error.details.email).toContain('Valid email is required');
    });
  });

  describe('GET /api/auth/verify', () => {
    test('should verify valid token', async () => {
      // First login to get token
      const loginResponse = await TestUtils.makeRequest('POST', '/api/auth/login', {
        username: 'admin',
        password: 'admin123'
      });

      const token = loginResponse.data.token;
      const response = await TestUtils.makeRequest('GET', '/api/auth/verify', null, token);

      TestAssertions.expectSuccess(response);
      expect(response.data.username).toBe('admin');
      expect(response.data.role).toBe('admin');
    });

    test('should reject invalid token', async () => {
      const response = await TestUtils.makeRequest('GET', '/api/auth/verify', null, 'invalid-token');

      TestAssertions.expectAuthError(response);
    });

    test('should reject expired token', async () => {
      // Create expired token
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 1 }, 
        'test-secret', 
        { expiresIn: '-1h' }
      );

      const response = await TestUtils.makeRequest('GET', '/api/auth/verify', null, expiredToken);

      TestAssertions.expectAuthError(response);
    });

    test('should reject missing token', async () => {
      const response = await TestUtils.makeRequest('GET', '/api/auth/verify');

      TestAssertions.expectAuthError(response);
    });
  });

  describe('PUT /api/auth/profile', () => {
    let authToken;

    beforeEach(async () => {
      const loginResponse = await TestUtils.makeRequest('POST', '/api/auth/login', {
        username: 'admin',
        password: 'admin123'
      });
      authToken = loginResponse.data.token;
    });

    test('should update user profile with valid data', async () => {
      const response = await TestUtils.makeRequest('PUT', '/api/auth/profile', {
        email: 'newemail@example.com',
        username: 'newusername'
      }, authToken);

      TestAssertions.expectSuccess(response);
      expect(response.data.user.email).toBe('newemail@example.com');
      expect(response.data.user.username).toBe('newusername');
    });

    test('should reject invalid email format', async () => {
      const response = await TestUtils.makeRequest('PUT', '/api/auth/profile', {
        email: 'invalid-email'
      }, authToken);

      TestAssertions.expectValidationError(response);
    });

    test('should reject without authentication', async () => {
      const response = await TestUtils.makeRequest('PUT', '/api/auth/profile', {
        email: 'newemail@example.com'
      });

      TestAssertions.expectAuthError(response);
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken;

    beforeEach(async () => {
      const loginResponse = await TestUtils.makeRequest('POST', '/api/auth/login', {
        username: 'admin',
        password: 'admin123'
      });
      authToken = loginResponse.data.token;
    });

    test('should logout successfully', async () => {
      const response = await TestUtils.makeRequest('POST', '/api/auth/logout', {}, authToken);

      TestAssertions.expectSuccess(response);
      expect(response.data.message).toContain('logged out');
    });

    test('should invalidate token after logout', async () => {
      // First logout
      await TestUtils.makeRequest('POST', '/api/auth/logout', {}, authToken);

      // Try to use token after logout
      const response = await TestUtils.makeRequest('GET', '/api/auth/verify', null, authToken);

      TestAssertions.expectAuthError(response);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limiting on login attempts', async () => {
      const requests = [];
      
      // Make many requests quickly
      for (let i = 0; i < 110; i++) {
        requests.push(
          TestUtils.makeRequest('POST', '/api/auth/login', {
            username: 'admin',
            password: 'wrongpassword'
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers', () => {
    test('should include security headers in responses', async () => {
      const response = await TestUtils.makeRequest('GET', '/api/health');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });
});
