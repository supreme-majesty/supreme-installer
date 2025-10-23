import { promisify } from 'util';
import { writeFile, appendFile } from 'fs';
import { join } from 'path';

const writeFileAsync = promisify(writeFile);
const appendFileAsync = promisify(appendFile);

// Error types and their corresponding HTTP status codes
const ERROR_TYPES = {
  VALIDATION_ERROR: 400,
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  DATABASE_ERROR: 500,
  FILE_SYSTEM_ERROR: 500,
  NETWORK_ERROR: 502,
  TIMEOUT_ERROR: 504
};

// Error severity levels
const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode, errorCode, severity = SEVERITY_LEVELS.MEDIUM, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.severity = severity;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.stack = this.stack;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error logging
export const logError = async (error, request = null) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: error.severity || SEVERITY_LEVELS.MEDIUM,
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode || 500,
    errorCode: error.errorCode || 'UNKNOWN_ERROR',
    url: request?.url,
    method: request?.method,
    ip: request?.ip,
    userAgent: request?.headers?.['user-agent'],
    userId: request?.user?.id,
    body: request?.body,
    query: request?.query,
    params: request?.params
  };

  // Log to console with appropriate level
  const logLevel = logEntry.level === SEVERITY_LEVELS.CRITICAL ? 'error' : 
                    logEntry.level === SEVERITY_LEVELS.HIGH ? 'warn' : 'info';
  
  console[logLevel](`[${logEntry.timestamp}] ${logEntry.level.toUpperCase()}: ${logEntry.message}`);
  
  if (logEntry.stack) {
    console.error(logEntry.stack);
  }

  // Log to file
  try {
    const logDir = join(process.cwd(), 'logs');
    const logFile = join(logDir, `error-${new Date().toISOString().split('T')[0]}.log`);
    
    await appendFileAsync(logFile, JSON.stringify(logEntry) + '\n');
  } catch (fileError) {
    console.error('Failed to write error log to file:', fileError);
  }
};

// Error response formatter
export const formatErrorResponse = (error, request) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response = {
    success: false,
    error: {
      message: error.message || 'An unexpected error occurred',
      code: error.errorCode || 'INTERNAL_SERVER_ERROR',
      statusCode: error.statusCode || 500,
      timestamp: new Date().toISOString(),
      requestId: request?.id || 'unknown'
    }
  };

  // Include stack trace in development
  if (isDevelopment && error.stack) {
    response.error.stack = error.stack;
  }

  // Include additional details for certain error types
  if (error.details) {
    response.error.details = error.details;
  }

  return response;
};

// Global error handler middleware
export const globalErrorHandler = async (error, request, reply) => {
  // Log the error
  await logError(error, request);

  // Determine status code
  let statusCode = error.statusCode || ERROR_TYPES.INTERNAL_SERVER_ERROR;
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = ERROR_TYPES.VALIDATION_ERROR;
  } else if (error.name === 'CastError') {
    statusCode = ERROR_TYPES.VALIDATION_ERROR;
  } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
    statusCode = ERROR_TYPES.DATABASE_ERROR;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = ERROR_TYPES.AUTHENTICATION_ERROR;
  } else if (error.name === 'TokenExpiredError') {
    statusCode = ERROR_TYPES.AUTHENTICATION_ERROR;
  }

  // Format error response
  const errorResponse = formatErrorResponse(error, request);

  // Send error response
  reply.code(statusCode).send(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (request, reply) => {
    Promise.resolve(fn(request, reply)).catch((error) => {
      globalErrorHandler(error, request, reply);
    });
  };
};

// Validation error handler
export const handleValidationError = (error) => {
  const errors = [];
  
  if (error.details) {
    error.details.forEach(detail => {
      errors.push({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      });
    });
  }

  return new AppError(
    'Validation failed',
    ERROR_TYPES.VALIDATION_ERROR,
    'VALIDATION_ERROR',
    SEVERITY_LEVELS.LOW,
    true
  );
};

// Database error handler
export const handleDatabaseError = (error) => {
  let message = 'Database operation failed';
  let severity = SEVERITY_LEVELS.MEDIUM;

  if (error.code === 11000) {
    message = 'Duplicate entry found';
    severity = SEVERITY_LEVELS.LOW;
  } else if (error.code === 'ECONNREFUSED') {
    message = 'Database connection refused';
    severity = SEVERITY_LEVELS.HIGH;
  } else if (error.code === 'ETIMEDOUT') {
    message = 'Database connection timeout';
    severity = SEVERITY_LEVELS.MEDIUM;
  }

  return new AppError(
    message,
    ERROR_TYPES.DATABASE_ERROR,
    'DATABASE_ERROR',
    severity,
    true
  );
};

// File system error handler
export const handleFileSystemError = (error) => {
  let message = 'File system operation failed';
  let severity = SEVERITY_LEVELS.MEDIUM;

  if (error.code === 'ENOENT') {
    message = 'File or directory not found';
    severity = SEVERITY_LEVELS.LOW;
  } else if (error.code === 'EACCES') {
    message = 'Permission denied';
    severity = SEVERITY_LEVELS.MEDIUM;
  } else if (error.code === 'ENOSPC') {
    message = 'No space left on device';
    severity = SEVERITY_LEVELS.HIGH;
  }

  return new AppError(
    message,
    ERROR_TYPES.FILE_SYSTEM_ERROR,
    'FILE_SYSTEM_ERROR',
    severity,
    true
  );
};

// Network error handler
export const handleNetworkError = (error) => {
  let message = 'Network operation failed';
  let severity = SEVERITY_LEVELS.MEDIUM;

  if (error.code === 'ECONNREFUSED') {
    message = 'Connection refused';
    severity = SEVERITY_LEVELS.HIGH;
  } else if (error.code === 'ETIMEDOUT') {
    message = 'Connection timeout';
    severity = SEVERITY_LEVELS.MEDIUM;
  } else if (error.code === 'ENOTFOUND') {
    message = 'Host not found';
    severity = SEVERITY_LEVELS.MEDIUM;
  }

  return new AppError(
    message,
    ERROR_TYPES.NETWORK_ERROR,
    'NETWORK_ERROR',
    severity,
    true
  );
};

// Error monitoring and alerting
export const monitorError = async (error, request) => {
  const isCritical = error.severity === SEVERITY_LEVELS.CRITICAL;
  const isHigh = error.severity === SEVERITY_LEVELS.HIGH;
  
  if (isCritical || isHigh) {
    // In production, you would send alerts to monitoring services
    console.error(`🚨 ${error.severity.toUpperCase()} ERROR DETECTED:`, {
      message: error.message,
      code: error.errorCode,
      url: request?.url,
      userId: request?.user?.id,
      timestamp: new Date().toISOString()
    });
    
    // Here you could integrate with services like:
    // - Sentry
    // - DataDog
    // - New Relic
    // - PagerDuty
    // - Slack notifications
  }
};

// Health check error handler
export const handleHealthCheckError = (error) => {
  return new AppError(
    'Health check failed',
    ERROR_TYPES.SERVICE_UNAVAILABLE,
    'HEALTH_CHECK_FAILED',
    SEVERITY_LEVELS.HIGH,
    true
  );
};

// Rate limiting error handler
export const handleRateLimitError = (error) => {
  return new AppError(
    'Too many requests',
    ERROR_TYPES.RATE_LIMIT_EXCEEDED,
    'RATE_LIMIT_EXCEEDED',
    SEVERITY_LEVELS.LOW,
    true
  );
};

// Timeout error handler
export const handleTimeoutError = (error) => {
  return new AppError(
    'Request timeout',
    ERROR_TYPES.TIMEOUT_ERROR,
    'TIMEOUT_ERROR',
    SEVERITY_LEVELS.MEDIUM,
    true
  );
};

// 404 error handler
export const handleNotFoundError = (request) => {
  return new AppError(
    `Route ${request.method} ${request.url} not found`,
    ERROR_TYPES.NOT_FOUND,
    'ROUTE_NOT_FOUND',
    SEVERITY_LEVELS.LOW,
    true
  );
};

// Unhandled promise rejection handler
export const handleUnhandledRejection = (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  
  const error = new AppError(
    'Unhandled promise rejection',
    ERROR_TYPES.INTERNAL_SERVER_ERROR,
    'UNHANDLED_REJECTION',
    SEVERITY_LEVELS.CRITICAL,
    false
  );
  
  logError(error);
};

// Uncaught exception handler
export const handleUncaughtException = (error) => {
  console.error('Uncaught Exception:', error);
  
  const appError = new AppError(
    'Uncaught exception',
    ERROR_TYPES.INTERNAL_SERVER_ERROR,
    'UNCAUGHT_EXCEPTION',
    SEVERITY_LEVELS.CRITICAL,
    false
  );
  
  logError(appError);
  
  // Graceful shutdown
  process.exit(1);
};

// Set up global error handlers
process.on('unhandledRejection', handleUnhandledRejection);
process.on('uncaughtException', handleUncaughtException);

export default {
  AppError,
  logError,
  globalErrorHandler,
  asyncHandler,
  handleValidationError,
  handleDatabaseError,
  handleFileSystemError,
  handleNetworkError,
  monitorError,
  handleHealthCheckError,
  handleRateLimitError,
  handleTimeoutError,
  handleNotFoundError,
  ERROR_TYPES,
  SEVERITY_LEVELS
};
