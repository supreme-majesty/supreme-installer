import { users } from './auth.js';

// Enhanced input sanitization with XSS protection
export const sanitizeInput = (request, reply, done) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // Remove potential XSS vectors
    return str
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '')
      .replace(/<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  };

  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => sanitize(item));
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

// Path traversal protection
export const validatePath = (path) => {
  if (!path || typeof path !== 'string') {
    return false;
  }
  
  // Check for path traversal attempts
  const dangerousPatterns = [
    /\.\./,           // Parent directory traversal
    /\/\.\./,         // Path with parent directory
    /\.\.\//,         // Parent directory with slash
    /\/\.\.\//,       // Path with parent directory
    /\.\.\\/,         // Windows path traversal
    /\\\.\.\\/,       // Windows path traversal
    /\.\.%2f/,        // URL encoded
    /%2e%2e/,         // URL encoded
    /%2e%2e%2f/,      // URL encoded
    /%2e%2e%5c/,      // URL encoded Windows
    /\.\.%5c/,        // URL encoded Windows
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(path));
};

// SQL injection protection
export const sanitizeSQL = (input) => {
  if (typeof input !== 'string') return input;
  
  const dangerousSQL = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(\b(OR|AND)\s+'.*'\s*=\s*'.*')/gi,
    /(\b(OR|AND)\s+".*"\s*=\s*".*")/gi,
    /(;|\-\-|\/\*|\*\/)/g,
    /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/gi
  ];
  
  let sanitized = input;
  dangerousSQL.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  return sanitized;
};

// Command injection protection
export const validateCommand = (command) => {
  if (!command || typeof command !== 'string') {
    return false;
  }
  
  const dangerousCommands = [
    'rm -rf', 'rmdir', 'del', 'format', 'fdisk',
    'mkfs', 'dd', 'shutdown', 'reboot', 'halt',
    'poweroff', 'init 0', 'init 6', 'killall',
    'pkill', 'kill -9', 'sudo', 'su', 'chmod 777',
    'chown', 'chgrp', 'passwd', 'useradd', 'userdel',
    'groupadd', 'groupdel', 'usermod', 'visudo',
    'crontab', 'at', 'batch', 'nohup', 'screen',
    'tmux', 'ssh', 'scp', 'rsync', 'wget', 'curl',
    'nc', 'netcat', 'telnet', 'ftp', 'sftp',
    'mount', 'umount', 'fdisk', 'parted', 'mkfs',
    'fsck', 'badblocks', 'debugfs', 'tune2fs',
    'e2fsck', 'resize2fs', 'dumpe2fs', 'tune2fs',
    'e2label', 'e2image', 'e2undo', 'e2fsck',
    'mke2fs', 'mkfs.ext2', 'mkfs.ext3', 'mkfs.ext4',
    'mkfs.xfs', 'mkfs.btrfs', 'mkfs.reiserfs',
    'mkfs.jfs', 'mkfs.ntfs', 'mkfs.vfat',
    'mkfs.fat', 'mkfs.msdos', 'mkfs.udf',
    'mkfs.iso9660', 'mkfs.udf', 'mkfs.udf',
    'mkfs.udf', 'mkfs.udf', 'mkfs.udf'
  ];
  
  const commandLower = command.toLowerCase();
  return !dangerousCommands.some(dangerous => 
    commandLower.includes(dangerous.toLowerCase())
  );
};

// Rate limiting helper
export const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  return (request, reply, done) => {
    const clientId = request.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [key, timestamp] of requests.entries()) {
      if (timestamp < windowStart) {
        requests.delete(key);
      }
    }
    
    const clientRequests = Array.from(requests.entries())
      .filter(([key, timestamp]) => key.startsWith(clientId) && timestamp > windowStart)
      .length;
    
    if (clientRequests >= maxRequests) {
      return reply.code(429).send({ 
        error: 'Too many requests', 
        retryAfter: Math.ceil(windowMs / 1000) 
      });
    }
    
    requests.set(`${clientId}-${now}`, now);
    done();
  };
};

export const validateLogin = (request, reply, done) => {
  const { username, password } = request.body;
  const errors = {};

  if (!username || username.trim().length < 3) {
    errors.username = 'Username must be at least 3 characters';
  } else if (username.length > 50) {
    errors.username = 'Username must be less than 50 characters';
  } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.username = 'Username can only contain letters, numbers, hyphens, and underscores';
  }

  if (!password || password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  } else if (password.length > 128) {
    errors.password = 'Password must be less than 128 characters';
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

