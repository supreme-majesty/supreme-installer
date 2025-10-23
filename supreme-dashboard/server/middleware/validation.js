import { users } from './auth.js';

export const validateLogin = (request, reply, done) => {
  const { username, password } = request.body;
  const errors = {};

  if (!username || username.trim().length < 3) {
    errors.username = 'Username must be at least 3 characters';
  }

  if (!password || password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (Object.keys(errors).length > 0) {
    return reply.code(400).send({ 
      error: 'Validation failed', 
      details: errors 
    });
  }

  done();
};

export const validateRegister = (request, reply, done) => {
  const { username, email, password, confirmPassword } = request.body;
  const errors = {};

  if (!username || username.trim().length < 3) {
    errors.username = 'Username must be at least 3 characters';
  } else if (users.find(u => u.username === username)) {
    errors.username = 'Username already exists';
  }

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    errors.email = 'Valid email is required';
  } else if (users.find(u => u.email === email)) {
    errors.email = 'Email already exists';
  }

  if (!password || password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (!confirmPassword || password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (Object.keys(errors).length > 0) {
    return reply.code(400).send({ 
      error: 'Validation failed', 
      details: errors 
    });
  }

  done();
};

export const validateProjectName = (request, reply, done) => {
  const { name } = request.params;
  const errors = {};

  if (!name || name.trim().length < 2) {
    errors.name = 'Project name must be at least 2 characters';
  } else if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
    errors.name = 'Project name can only contain letters, numbers, hyphens, and underscores';
  }

  if (Object.keys(errors).length > 0) {
    return reply.code(400).send({ 
      error: 'Validation failed', 
      details: errors 
    });
  }

  done();
};

export const sanitizeInput = (request, reply, done) => {
  // Basic input sanitization
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/[<>]/g, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (request.body) {
    request.body = sanitize(request.body);
  }

  if (request.query) {
    request.query = sanitize(request.query);
  }

  if (request.params) {
    request.params = sanitize(request.params);
  }

  done();
};
