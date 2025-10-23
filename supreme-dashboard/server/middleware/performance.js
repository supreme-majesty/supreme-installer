import { promisify } from 'util';
import { createHash } from 'crypto';
import { readFile, writeFile, existsSync } from 'fs';
import { join } from 'path';

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

// Cache configuration
const CACHE_CONFIG = {
  TTL: 5 * 60 * 1000, // 5 minutes
  MAX_SIZE: 100, // Maximum number of cached items
  CLEANUP_INTERVAL: 60 * 1000, // 1 minute
  ENABLE_COMPRESSION: true,
  ENABLE_ETAG: true
};

// In-memory cache
const cache = new Map();
const cacheStats = {
  hits: 0,
  misses: 0,
  evictions: 0,
  size: 0
};

// Cache entry structure
class CacheEntry {
  constructor(data, ttl = CACHE_CONFIG.TTL) {
    this.data = data;
    this.timestamp = Date.now();
    this.ttl = ttl;
    this.accessCount = 0;
    this.lastAccessed = Date.now();
  }

  isExpired() {
    return Date.now() - this.timestamp > this.ttl;
  }

  touch() {
    this.accessCount++;
    this.lastAccessed = Date.now();
  }
}

// Cache management
export class CacheManager {
  static get(key) {
    const entry = cache.get(key);
    
    if (!entry) {
      cacheStats.misses++;
      return null;
    }

    if (entry.isExpired()) {
      cache.delete(key);
      cacheStats.misses++;
      cacheStats.evictions++;
      return null;
    }

    entry.touch();
    cacheStats.hits++;
    return entry.data;
  }

  static set(key, data, ttl = CACHE_CONFIG.TTL) {
    // Check cache size limit
    if (cache.size >= CACHE_CONFIG.MAX_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    cache.set(key, new CacheEntry(data, ttl));
    cacheStats.size = cache.size;
  }

  static delete(key) {
    const deleted = cache.delete(key);
    if (deleted) {
      cacheStats.evictions++;
      cacheStats.size = cache.size;
    }
    return deleted;
  }

  static clear() {
    cache.clear();
    cacheStats.size = 0;
  }

  static evictLeastRecentlyUsed() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      cacheStats.evictions++;
    }
  }

  static getStats() {
    const total = cacheStats.hits + cacheStats.misses;
    const hitRate = total > 0 ? (cacheStats.hits / total) * 100 : 0;

    return {
      ...cacheStats,
      hitRate: Math.round(hitRate * 100) / 100,
      size: cache.size,
      maxSize: CACHE_CONFIG.MAX_SIZE
    };
  }

  static cleanup() {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.isExpired()) {
        cache.delete(key);
        cacheStats.evictions++;
      }
    }
    cacheStats.size = cache.size;
  }
}

// Generate cache key
const generateCacheKey = (request) => {
  const keyData = {
    url: request.url,
    method: request.method,
    query: request.query,
    user: request.user?.id
  };
  
  const keyString = JSON.stringify(keyData);
  return createHash('md5').update(keyString).digest('hex');
};

// Generate ETag
const generateETag = (data) => {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  return createHash('md5').update(dataString).digest('hex');
};

// Compression utilities
const compressData = (data) => {
  if (!CACHE_CONFIG.ENABLE_COMPRESSION) return data;
  
  try {
    const zlib = require('zlib');
    const compressed = zlib.gzipSync(JSON.stringify(data));
    return { compressed: true, data: compressed.toString('base64') };
  } catch (error) {
    console.error('Compression failed:', error);
    return data;
  }
};

const decompressData = (data) => {
  if (!data.compressed) return data;
  
  try {
    const zlib = require('zlib');
    const decompressed = zlib.gunzipSync(Buffer.from(data.data, 'base64'));
    return JSON.parse(decompressed.toString());
  } catch (error) {
    console.error('Decompression failed:', error);
    return data;
  }
};

// Cache middleware
export const cacheMiddleware = (options = {}) => {
  const {
    ttl = CACHE_CONFIG.TTL,
    keyGenerator = generateCacheKey,
    skipCache = (request) => false,
    skipCacheForErrors = true
  } = options;

  return async (request, reply) => {
    // Skip caching for certain requests
    if (skipCache(request)) {
      return;
    }

    const cacheKey = keyGenerator(request);
    const cachedData = CacheManager.get(cacheKey);

    if (cachedData) {
      // Set cache headers
      reply.header('X-Cache', 'HIT');
      reply.header('X-Cache-Key', cacheKey);
      
      // Set ETag if enabled
      if (CACHE_CONFIG.ENABLE_ETAG) {
        const etag = generateETag(cachedData);
        reply.header('ETag', etag);
        
        // Check if client has cached version
        const clientETag = request.headers['if-none-match'];
        if (clientETag === etag) {
          return reply.code(304).send();
        }
      }

      // Return cached data
      return reply.send(cachedData);
    }

    // Store original send method
    const originalSend = reply.send;

    // Override send method to cache response
    reply.send = function(data) {
      // Don't cache errors
      if (skipCacheForErrors && reply.statusCode >= 400) {
        return originalSend.call(this, data);
      }

      // Cache successful responses
      if (reply.statusCode >= 200 && reply.statusCode < 300) {
        const dataToCache = compressData(data);
        CacheManager.set(cacheKey, dataToCache, ttl);
        
        // Set cache headers
        reply.header('X-Cache', 'MISS');
        reply.header('X-Cache-Key', cacheKey);
        
        // Set ETag if enabled
        if (CACHE_CONFIG.ENABLE_ETAG) {
          const etag = generateETag(data);
          reply.header('ETag', etag);
        }
      }

      return originalSend.call(this, data);
    };
  };
};

// Response compression middleware
export const compressionMiddleware = (request, reply) => {
  const acceptEncoding = request.headers['accept-encoding'] || '';
  
  if (acceptEncoding.includes('gzip')) {
    reply.header('Content-Encoding', 'gzip');
  } else if (acceptEncoding.includes('deflate')) {
    reply.header('Content-Encoding', 'deflate');
  }
};

// Request timing middleware
export const timingMiddleware = (request, reply) => {
  const startTime = Date.now();
  
  reply.addHook('onSend', (request, reply, payload, done) => {
    const duration = Date.now() - startTime;
    reply.header('X-Response-Time', `${duration}ms`);
    done();
  });
};

// Memory usage monitoring
export const memoryMonitoring = (request, reply) => {
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };

  reply.header('X-Memory-Usage', JSON.stringify(memUsageMB));
};

// Database query optimization
export const queryOptimization = {
  // Connection pooling
  createConnectionPool: (config) => {
    const pool = {
      connections: [],
      maxConnections: config.maxConnections || 10,
      currentConnections: 0,
      
      async getConnection() {
        if (this.connections.length > 0) {
          return this.connections.pop();
        }
        
        if (this.currentConnections < this.maxConnections) {
          this.currentConnections++;
          return await this.createConnection();
        }
        
        // Wait for available connection
        return new Promise((resolve) => {
          const checkConnection = () => {
            if (this.connections.length > 0) {
              resolve(this.connections.pop());
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        });
      },
      
      releaseConnection(connection) {
        this.connections.push(connection);
      },
      
      async createConnection() {
        // Implement actual connection creation
        return { id: Math.random(), connected: true };
      }
    };
    
    return pool;
  },

  // Query caching
  cacheQuery: (query, ttl = 300000) => { // 5 minutes default
    const queryKey = createHash('md5').update(query).digest('hex');
    return {
      key: queryKey,
      ttl,
      get: () => CacheManager.get(queryKey),
      set: (data) => CacheManager.set(queryKey, data, ttl)
    };
  },

  // Query optimization
  optimizeQuery: (query) => {
    // Add query hints and optimizations
    const optimizedQuery = query
      .replace(/SELECT \*/g, 'SELECT specific_columns') // Avoid SELECT *
      .replace(/WHERE 1=1/g, 'WHERE true') // Optimize WHERE clauses
      .replace(/ORDER BY RAND\(\)/g, 'ORDER BY id'); // Avoid RAND() in ORDER BY
    
    return optimizedQuery;
  }
};

// Lazy loading for large datasets
export const lazyLoading = {
  paginate: (data, page = 1, limit = 10) => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      data: data.slice(startIndex, endIndex),
      pagination: {
        page,
        limit,
        total: data.length,
        pages: Math.ceil(data.length / limit),
        hasNext: endIndex < data.length,
        hasPrev: page > 1
      }
    };
  },

  stream: async function* (dataGenerator, chunkSize = 100) {
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const chunk = await dataGenerator(offset, chunkSize);
      if (chunk.length === 0) {
        hasMore = false;
      } else {
        yield chunk;
        offset += chunkSize;
      }
    }
  }
};

// Performance metrics collection
export const performanceMetrics = {
  metrics: {
    requests: 0,
    totalResponseTime: 0,
    averageResponseTime: 0,
    slowestRequest: 0,
    fastestRequest: Infinity,
    errors: 0,
    cacheHits: 0,
    cacheMisses: 0
  },

  recordRequest: (responseTime, isError = false, isCacheHit = false) => {
    this.metrics.requests++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.requests;
    
    if (responseTime > this.metrics.slowestRequest) {
      this.metrics.slowestRequest = responseTime;
    }
    
    if (responseTime < this.metrics.fastestRequest) {
      this.metrics.fastestRequest = responseTime;
    }
    
    if (isError) {
      this.metrics.errors++;
    }
    
    if (isCacheHit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  },

  getMetrics: () => ({
    ...this.metrics,
    errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0,
    cacheHitRate: (this.metrics.cacheHits + this.metrics.cacheMisses) > 0 ? 
      (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0
  }),

  reset: () => {
    this.metrics = {
      requests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      slowestRequest: 0,
      fastestRequest: Infinity,
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }
};

// Start cache cleanup interval
setInterval(() => {
  CacheManager.cleanup();
}, CACHE_CONFIG.CLEANUP_INTERVAL);

// Export cache manager for external use
export { CacheManager };

export default {
  cacheMiddleware,
  compressionMiddleware,
  timingMiddleware,
  memoryMonitoring,
  queryOptimization,
  lazyLoading,
  performanceMetrics,
  CacheManager
};
