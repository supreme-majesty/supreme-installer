import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// Register CORS plugin
await fastify.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
});

// Register static file serving for production
await fastify.register(staticFiles, {
  root: join(__dirname, '../client/dist'),
  prefix: '/'
});

// Supreme CLI integration helper
const runSupremeCommand = async (command) => {
  try {
    const { stdout, stderr } = await execAsync(`supreme ${command}`);
    return { success: true, output: stdout, error: stderr };
  } catch (error) {
    return { success: false, output: error.stdout || '', error: error.stderr || error.message };
  }
};

// Load Supreme configuration
const loadSupremeConfig = () => {
  try {
    const configPath = `${process.env.HOME}/.supreme/config.env`;
    if (existsSync(configPath)) {
      const configContent = readFileSync(configPath, 'utf8');
      const config = {};
      configContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          config[key] = value;
        }
      });
      return config;
    }
    return null;
  } catch (error) {
    console.error('Error loading Supreme config:', error);
    return null;
  }
};

// Helper function to get directory size
const getDirectorySize = async (dirPath) => {
  try {
    const { stdout } = await execAsync(`du -sh "${dirPath}" | cut -f1`);
    return stdout.trim();
  } catch (error) {
    return 'Unknown';
  }
};

// Projects API endpoints
fastify.get('/api/projects', async (request, reply) => {
  try {
    const config = loadSupremeConfig();
    if (!config) {
      return reply.code(500).send({ error: 'Supreme configuration not found' });
    }

    const htdocsRoot = config.HTDOCS_ROOT || '/var/www/html';
    const projects = [];

    if (existsSync(htdocsRoot)) {
      const projectDirs = readdirSync(htdocsRoot, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const projectName of projectDirs) {
        const projectPath = join(htdocsRoot, projectName);
        const stats = statSync(projectPath);
        
        // Check if vhost is enabled
        const vhostEnabled = existsSync(`/etc/supreme/sites-enabled/${projectName}.conf`);
        
        // Check SSL status
        const sslEnabled = config.DEFAULT_PROTOCOL === 'https';
        
        // Get project type
        let projectType = 'static';
        if (existsSync(join(projectPath, 'package.json'))) {
          projectType = 'node';
        } else if (existsSync(join(projectPath, 'composer.json'))) {
          projectType = 'php';
        } else if (existsSync(join(projectPath, 'requirements.txt')) || existsSync(join(projectPath, 'pyproject.toml'))) {
          projectType = 'python';
        }

        projects.push({
          name: projectName,
          path: projectPath,
          type: projectType,
          status: vhostEnabled ? 'active' : 'inactive',
          protocol: sslEnabled ? 'https' : 'http',
          url: `${sslEnabled ? 'https' : 'http'}://${projectName}.${config.TLD || 'test'}`,
          created: stats.birthtime,
          modified: stats.mtime,
          size: await getDirectorySize(projectPath)
        });
      }
    }

    return {
      projects,
      total: projects.length,
      active: projects.filter(p => p.status === 'active').length,
      inactive: projects.filter(p => p.status === 'inactive').length
    };
  } catch (error) {
    return reply.code(500).send({ error: error.message });
  }
});

// Project actions
fastify.post('/api/projects/:name/start', async (request, reply) => {
  const { name } = request.params;
  const result = await runSupremeCommand(`start ${name}`);
  return result;
});

fastify.post('/api/projects/:name/stop', async (request, reply) => {
  const { name } = request.params;
  const result = await runSupremeCommand(`stop ${name}`);
  return result;
});

fastify.post('/api/projects/:name/status', async (request, reply) => {
  const { name } = request.params;
  const result = await runSupremeCommand(`status ${name}`);
  return result;
});

// SSL Management endpoints
fastify.get('/api/ssl/status', async (request, reply) => {
  try {
    const config = loadSupremeConfig();
    if (!config) {
      return reply.code(500).send({ error: 'Supreme configuration not found' });
    }

    const certDir = config.CERT_DIR || '/etc/ssl/certs';
    const tld = config.TLD || 'test';
    const wildcardCert = `${certDir}/_wildcard.${tld}.pem`;
    
    let certInfo = null;
    if (existsSync(wildcardCert)) {
      try {
        const { stdout } = await execAsync(`openssl x509 -in ${wildcardCert} -text -noout`);
        const notAfterMatch = stdout.match(/Not After : (.+)/);
        const notBeforeMatch = stdout.match(/Not Before : (.+)/);
        
        if (notAfterMatch && notBeforeMatch) {
          certInfo = {
            exists: true,
            notBefore: new Date(notBeforeMatch[1]),
            notAfter: new Date(notAfterMatch[1]),
            daysUntilExpiry: Math.ceil((new Date(notAfterMatch[1]) - new Date()) / (1000 * 60 * 60 * 24))
          };
        }
      } catch (error) {
        console.error('Error reading certificate:', error);
      }
    }

    return {
      enabled: config.DEFAULT_PROTOCOL === 'https',
      certificate: certInfo,
      tld: tld
    };
  } catch (error) {
    return reply.code(500).send({ error: error.message });
  }
});

fastify.post('/api/ssl/renew', async (request, reply) => {
  const result = await runSupremeCommand('ssl renew');
  return result;
});

fastify.post('/api/ssl/enable', async (request, reply) => {
  const result = await runSupremeCommand('enable https');
  return result;
});

fastify.post('/api/ssl/disable', async (request, reply) => {
  const result = await runSupremeCommand('disable https');
  return result;
});

// System operations
fastify.post('/api/system/restart-apache', async (request, reply) => {
  const result = await runSupremeCommand('restart');
  return result;
});

fastify.get('/api/system/health', async (request, reply) => {
  const result = await runSupremeCommand('doctor');
  return result;
});

// Logs endpoint
fastify.get('/api/logs', async (request, reply) => {
  try {
    const { project, lines = 100 } = request.query;
    let logPath = '/var/log/apache2/error.log';
    
    if (project) {
      logPath = `/var/log/apache2/${project}.error.log`;
    }
    
    if (!existsSync(logPath)) {
      return reply.code(404).send({ error: 'Log file not found' });
    }

    const { stdout } = await execAsync(`tail -n ${lines} ${logPath}`);
    return { logs: stdout.split('\n').filter(line => line.trim()) };
  } catch (error) {
    return reply.code(500).send({ error: error.message });
  }
});

// System info route
fastify.get('/api/system', async (request, reply) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  return {
    status: 'online',
    uptime: {
      seconds: Math.floor(uptime),
      formatted: formatUptime(uptime)
    },
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch
    },
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    },
    timestamp: new Date().toISOString()
  };
});

// Modules route
fastify.get('/api/modules', async (request, reply) => {
  // Mock data for installed modules
  const modules = [
    {
      id: 'platform',
      name: 'Platform Detection',
      version: '2.0.0',
      description: 'Cross-platform detection and configuration',
      status: 'active',
      lastUpdated: '2024-01-15T10:30:00Z'
    },
    {
      id: 'ssl',
      name: 'SSL Management',
      version: '2.0.0',
      description: 'SSL certificate generation and management',
      status: 'active',
      lastUpdated: '2024-01-15T10:30:00Z'
    },
    {
      id: 'database',
      name: 'Database Operations',
      version: '2.0.0',
      description: 'Database creation, management, and health checks',
      status: 'active',
      lastUpdated: '2024-01-15T10:30:00Z'
    },
    {
      id: 'projects',
      name: 'Project Management',
      version: '2.0.0',
      description: 'Framework-specific project creation and management',
      status: 'active',
      lastUpdated: '2024-01-15T10:30:00Z'
    },
    {
      id: 'dependencies',
      name: 'Dependency Manager',
      version: '2.0.0',
      description: 'Smart dependency detection and installation',
      status: 'active',
      lastUpdated: '2024-01-15T10:30:00Z'
    },
    {
      id: 'sync',
      name: 'Cloud Sync',
      version: '2.0.0',
      description: 'Configuration and SSL certificate cloud synchronization',
      status: 'inactive',
      lastUpdated: '2024-01-10T14:20:00Z'
    }
  ];

  return {
    modules,
    total: modules.length,
    active: modules.filter(m => m.status === 'active').length,
    inactive: modules.filter(m => m.status === 'inactive').length
  };
});

// Settings route
fastify.post('/api/settings', async (request, reply) => {
  const settings = request.body;
  
  // In a real application, you would save these settings to a database or config file
  console.log('Settings received:', settings);
  
  return {
    success: true,
    message: 'Settings saved successfully',
    timestamp: new Date().toISOString(),
    settings: settings
  };
});

// Dashboard stats route
fastify.get('/api/stats', async (request, reply) => {
  // Mock dashboard statistics
  return {
    projects: {
      total: 12,
      active: 8,
      inactive: 4
    },
    system: {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100
    },
    performance: {
      avgResponseTime: Math.random() * 200 + 50,
      requestsPerMinute: Math.floor(Math.random() * 1000 + 500),
      uptime: process.uptime()
    }
  };
});

// Health check route
fastify.get('/api/health', async (request, reply) => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
});

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 5000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`🚀 Supreme Dashboard Server running on http://${host}:${port}`);
    console.log(`📊 API available at http://${host}:${port}/api`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
