import { promisify } from 'util';
import { exec } from 'child_process';
import { readFile, writeFile, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';

const execAsync = promisify(exec);
const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

// System metrics collection
export class SystemMetrics {
  static async getCPUUsage() {
    try {
      const { stdout } = await execAsync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | awk -F\'%\' \'{print $1}\'');
      return parseFloat(stdout.trim()) || 0;
    } catch (error) {
      // Fallback to Node.js process CPU usage
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });
      
      return 100 - ~~(100 * totalIdle / totalTick);
    }
  }

  static async getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      total: Math.round(totalMem / 1024 / 1024), // MB
      used: Math.round(usedMem / 1024 / 1024), // MB
      free: Math.round(freeMem / 1024 / 1024), // MB
      percentage: Math.round((usedMem / totalMem) * 100)
    };
  }

  static async getDiskUsage() {
    try {
      const { stdout } = await execAsync('df -h / | tail -1 | awk \'{print $5}\' | sed \'s/%//\'');
      return parseInt(stdout.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }

  static async getNetworkStats() {
    try {
      const { stdout } = await execAsync('cat /proc/net/dev | grep -E "(eth0|wlan0|en0)" | head -1');
      const parts = stdout.trim().split(/\s+/);
      
      return {
        bytesReceived: parseInt(parts[1]) || 0,
        bytesTransmitted: parseInt(parts[9]) || 0,
        packetsReceived: parseInt(parts[2]) || 0,
        packetsTransmitted: parseInt(parts[10]) || 0
      };
    } catch (error) {
      return {
        bytesReceived: 0,
        bytesTransmitted: 0,
        packetsReceived: 0,
        packetsTransmitted: 0
      };
    }
  }

  static async getProcessInfo() {
    const processInfo = {
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform,
      arch: process.arch
    };

    return processInfo;
  }

  static async getSystemInfo() {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      cpus: os.cpus().length,
      networkInterfaces: os.networkInterfaces()
    };
  }
}

// Application metrics
export class ApplicationMetrics {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byMethod: {},
        byEndpoint: {},
        byStatus: {}
      },
      responseTime: {
        min: Infinity,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        samples: []
      },
      errors: {
        total: 0,
        byType: {},
        byEndpoint: {},
        recent: []
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      database: {
        queries: 0,
        slowQueries: 0,
        avgQueryTime: 0
      },
      users: {
        active: 0,
        total: 0,
        newToday: 0
      }
    };
  }

  recordRequest(method, endpoint, statusCode, responseTime, isError = false) {
    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 300) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Record by method
    this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;
    
    // Record by endpoint
    this.metrics.requests.byEndpoint[endpoint] = (this.metrics.requests.byEndpoint[endpoint] || 0) + 1;
    
    // Record by status
    this.metrics.requests.byStatus[statusCode] = (this.metrics.requests.byStatus[statusCode] || 0) + 1;

    // Record response time
    this.metrics.responseTime.samples.push(responseTime);
    if (this.metrics.responseTime.samples.length > 1000) {
      this.metrics.responseTime.samples = this.metrics.responseTime.samples.slice(-1000);
    }

    this.metrics.responseTime.min = Math.min(this.metrics.responseTime.min, responseTime);
    this.metrics.responseTime.max = Math.max(this.metrics.responseTime.max, responseTime);
    this.metrics.responseTime.avg = this.calculateAverage(this.metrics.responseTime.samples);

    // Calculate percentiles
    const sortedSamples = [...this.metrics.responseTime.samples].sort((a, b) => a - b);
    this.metrics.responseTime.p50 = this.calculatePercentile(sortedSamples, 50);
    this.metrics.responseTime.p95 = this.calculatePercentile(sortedSamples, 95);
    this.metrics.responseTime.p99 = this.calculatePercentile(sortedSamples, 99);

    // Record errors
    if (isError) {
      this.metrics.errors.total++;
      this.metrics.errors.recent.push({
        timestamp: new Date(),
        endpoint,
        statusCode,
        message: 'Request failed'
      });

      if (this.metrics.errors.recent.length > 100) {
        this.metrics.errors.recent = this.metrics.errors.recent.slice(-100);
      }
    }
  }

  recordCacheHit() {
    this.metrics.cache.hits++;
    this.updateCacheHitRate();
  }

  recordCacheMiss() {
    this.metrics.cache.misses++;
    this.updateCacheHitRate();
  }

  recordDatabaseQuery(queryTime, isSlow = false) {
    this.metrics.database.queries++;
    if (isSlow) {
      this.metrics.database.slowQueries++;
    }
    this.metrics.database.avgQueryTime = this.calculateAverage([
      this.metrics.database.avgQueryTime,
      queryTime
    ]);
  }

  updateCacheHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total) * 100 : 0;
  }

  calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  calculatePercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[index];
  }

  getMetrics() {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byMethod: {},
        byEndpoint: {},
        byStatus: {}
      },
      responseTime: {
        min: Infinity,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        samples: []
      },
      errors: {
        total: 0,
        byType: {},
        byEndpoint: {},
        recent: []
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      database: {
        queries: 0,
        slowQueries: 0,
        avgQueryTime: 0
      },
      users: {
        active: 0,
        total: 0,
        newToday: 0
      }
    };
  }
}

// Health check system
export class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.status = 'unknown';
    this.lastCheck = null;
    this.checkInterval = 30000; // 30 seconds
  }

  addCheck(name, checkFunction, critical = false) {
    this.checks.set(name, {
      function: checkFunction,
      critical,
      lastResult: null,
      lastCheck: null
    });
  }

  async runChecks() {
    const results = {};
    let overallHealthy = true;

    for (const [name, check] of this.checks) {
      try {
        const result = await check.function();
        check.lastResult = result;
        check.lastCheck = new Date();
        results[name] = result;

        if (check.critical && !result.healthy) {
          overallHealthy = false;
        }
      } catch (error) {
        const errorResult = {
          healthy: false,
          message: error.message,
          error: error.toString()
        };
        
        check.lastResult = errorResult;
        check.lastCheck = new Date();
        results[name] = errorResult;

        if (check.critical) {
          overallHealthy = false;
        }
      }
    }

    this.status = overallHealthy ? 'healthy' : 'unhealthy';
    this.lastCheck = new Date();

    return {
      status: this.status,
      timestamp: this.lastCheck,
      checks: results
    };
  }

  getStatus() {
    return {
      status: this.status,
      lastCheck: this.lastCheck,
      checks: Array.from(this.checks.entries()).map(([name, check]) => ({
        name,
        critical: check.critical,
        lastResult: check.lastResult,
        lastCheck: check.lastCheck
      }))
    };
  }

  startPeriodicChecks() {
    setInterval(() => {
      this.runChecks();
    }, this.checkInterval);
  }
}

// Alert system
export class AlertManager {
  constructor() {
    this.alerts = [];
    this.rules = new Map();
    this.notifications = [];
  }

  addRule(name, condition, severity = 'warning', cooldown = 300000) {
    this.rules.set(name, {
      condition,
      severity,
      cooldown,
      lastTriggered: null
    });
  }

  checkAlerts(metrics) {
    for (const [name, rule] of this.rules) {
      if (rule.condition(metrics)) {
        const now = Date.now();
        const canTrigger = !rule.lastTriggered || (now - rule.lastTriggered) > rule.cooldown;

        if (canTrigger) {
          this.triggerAlert(name, rule.severity, metrics);
          rule.lastTriggered = now;
        }
      }
    }
  }

  triggerAlert(name, severity, metrics) {
    const alert = {
      id: Date.now(),
      name,
      severity,
      timestamp: new Date(),
      metrics: { ...metrics },
      resolved: false
    };

    this.alerts.push(alert);
    this.notifications.push(alert);

    console.log(`🚨 ALERT: ${name} (${severity})`);
    console.log(`Metrics:`, metrics);
  }

  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
    }
  }

  getActiveAlerts() {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getNotifications() {
    return this.notifications.slice(-50); // Last 50 notifications
  }
}

// Real-time monitoring
export class RealTimeMonitor {
  constructor() {
    this.connections = new Set();
    this.metrics = new ApplicationMetrics();
    this.healthChecker = new HealthChecker();
    this.alertManager = new AlertManager();
    
    this.setupDefaultChecks();
    this.setupDefaultAlerts();
  }

  setupDefaultChecks() {
    // Database health check
    this.healthChecker.addCheck('database', async () => {
      try {
        // Implement actual database health check
        return { healthy: true, message: 'Database connection OK' };
      } catch (error) {
        return { healthy: false, message: error.message };
      }
    }, true);

    // Memory usage check
    this.healthChecker.addCheck('memory', async () => {
      const memUsage = await SystemMetrics.getMemoryUsage();
      const isHealthy = memUsage.percentage < 90;
      return {
        healthy: isHealthy,
        message: `Memory usage: ${memUsage.percentage}%`,
        details: memUsage
      };
    });

    // Disk usage check
    this.healthChecker.addCheck('disk', async () => {
      const diskUsage = await SystemMetrics.getDiskUsage();
      const isHealthy = diskUsage < 90;
      return {
        healthy: isHealthy,
        message: `Disk usage: ${diskUsage}%`,
        details: { usage: diskUsage }
      };
    });
  }

  setupDefaultAlerts() {
    // High CPU usage alert
    this.alertManager.addRule('high_cpu', (metrics) => {
      return metrics.system?.cpu > 90;
    }, 'critical');

    // High memory usage alert
    this.alertManager.addRule('high_memory', (metrics) => {
      return metrics.system?.memory?.percentage > 90;
    }, 'critical');

    // High error rate alert
    this.alertManager.addRule('high_error_rate', (metrics) => {
      const errorRate = (metrics.application?.requests?.failed / metrics.application?.requests?.total) * 100;
      return errorRate > 10;
    }, 'warning');

    // Slow response time alert
    this.alertManager.addRule('slow_response', (metrics) => {
      return metrics.application?.responseTime?.avg > 5000;
    }, 'warning');
  }

  addConnection(connection) {
    this.connections.add(connection);
  }

  removeConnection(connection) {
    this.connections.delete(connection);
  }

  async collectMetrics() {
    const systemMetrics = {
      cpu: await SystemMetrics.getCPUUsage(),
      memory: await SystemMetrics.getMemoryUsage(),
      disk: await SystemMetrics.getDiskUsage(),
      network: await SystemMetrics.getNetworkStats(),
      process: await SystemMetrics.getProcessInfo(),
      system: await SystemMetrics.getSystemInfo()
    };

    const applicationMetrics = this.metrics.getMetrics();
    const healthStatus = await this.healthChecker.runChecks();

    const allMetrics = {
      timestamp: new Date(),
      system: systemMetrics,
      application: applicationMetrics,
      health: healthStatus
    };

    // Check for alerts
    this.alertManager.checkAlerts(allMetrics);

    return allMetrics;
  }

  async broadcastMetrics() {
    const metrics = await this.collectMetrics();
    
    const message = JSON.stringify({
      type: 'metrics',
      data: metrics
    });

    this.connections.forEach(connection => {
      if (connection.readyState === 1) { // WebSocket.OPEN
        connection.send(message);
      }
    });
  }

  startMonitoring() {
    // Start periodic health checks
    this.healthChecker.startPeriodicChecks();
    
    // Start metrics broadcasting
    setInterval(() => {
      this.broadcastMetrics();
    }, 5000); // Every 5 seconds
  }

  getDashboardData() {
    return {
      metrics: this.metrics.getMetrics(),
      health: this.healthChecker.getStatus(),
      alerts: this.alertManager.getActiveAlerts(),
      notifications: this.alertManager.getNotifications()
    };
  }
}

// Create global monitor instance
export const globalMonitor = new RealTimeMonitor();

// Middleware for request monitoring
export const monitoringMiddleware = (request, reply) => {
  const startTime = Date.now();
  
  reply.addHook('onSend', (request, reply, payload, done) => {
    const responseTime = Date.now() - startTime;
    const isError = reply.statusCode >= 400;
    
    globalMonitor.metrics.recordRequest(
      request.method,
      request.url,
      reply.statusCode,
      responseTime,
      isError
    );
    
    done();
  });
};

export default {
  SystemMetrics,
  ApplicationMetrics,
  HealthChecker,
  AlertManager,
  RealTimeMonitor,
  globalMonitor,
  monitoringMiddleware
};
