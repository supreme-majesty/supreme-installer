import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import bcrypt from 'bcrypt';
import { generateToken, verifyToken, authenticateToken, requireRole, users } from './middleware/auth.js';
import { validateLogin, validateRegister, validateProjectName, sanitizeInput } from './middleware/validation.js';
import { 
  initializeDatabase, 
  getDatabases, 
  getTables, 
  executeCustomQuery, 
  getTableStructure, 
  createDatabase, 
  deleteDatabase, 
  testConnection 
} from './middleware/database.js';

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

// Register global middleware
fastify.addHook('preHandler', sanitizeInput);

// Initialize database connection
const dbInitialized = initializeDatabase();

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

// Authentication routes
fastify.post('/api/auth/login', { preHandler: validateLogin }, async (request, reply) => {
  try {
    const { username, password } = request.body;
    
    const user = users.find(u => u.username === username);
    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // In production, use bcrypt.compare(password, user.password)
    // For demo purposes, using simple comparison
    const isValidPassword = password === 'admin123' || password === 'dev123';
    if (!isValidPassword) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    
    // Update last login
    user.lastLogin = new Date();

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      }
    };
  } catch (error) {
    return reply.code(500).send({ error: 'Login failed' });
  }
});

fastify.post('/api/auth/register', { preHandler: validateRegister }, async (request, reply) => {
  try {
    const { username, email, password } = request.body;
    
    // In production, hash the password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = {
      id: users.length + 1,
      username,
      email,
      password: hashedPassword,
      role: 'developer',
      createdAt: new Date(),
      lastLogin: null
    };
    
    users.push(newUser);
    
    const token = generateToken(newUser.id);
    
    return {
      success: true,
      message: 'User created successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    };
  } catch (error) {
    return reply.code(500).send({ error: 'Registration failed' });
  }
});

fastify.get('/api/auth/verify', { preHandler: authenticateToken }, async (request, reply) => {
  return {
    id: request.user.id,
    username: request.user.username,
    email: request.user.email,
    role: request.user.role,
    lastLogin: request.user.lastLogin
  };
});

fastify.put('/api/auth/profile', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const { email, username } = request.body;
    const user = users.find(u => u.id === request.user.id);
    
    if (email) user.email = email;
    if (username) user.username = username;
    
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      }
    };
  } catch (error) {
    return reply.code(500).send({ error: 'Profile update failed' });
  }
});

// Projects API endpoints
fastify.get('/api/projects', { preHandler: authenticateToken }, async (request, reply) => {
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
fastify.post('/api/projects/:name/start', { preHandler: [authenticateToken, validateProjectName] }, async (request, reply) => {
  const { name } = request.params;
  const result = await runSupremeCommand(`start ${name}`);
  return result;
});

fastify.post('/api/projects/:name/stop', { preHandler: [authenticateToken, validateProjectName] }, async (request, reply) => {
  const { name } = request.params;
  const result = await runSupremeCommand(`stop ${name}`);
  return result;
});

fastify.post('/api/projects/:name/status', { preHandler: [authenticateToken, validateProjectName] }, async (request, reply) => {
  const { name } = request.params;
  const result = await runSupremeCommand(`status ${name}`);
  return result;
});

// SSL Management endpoints
fastify.get('/api/ssl/status', { preHandler: authenticateToken }, async (request, reply) => {
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

fastify.post('/api/ssl/renew', { preHandler: authenticateToken }, async (request, reply) => {
  const result = await runSupremeCommand('ssl renew');
  return result;
});

fastify.post('/api/ssl/enable', { preHandler: authenticateToken }, async (request, reply) => {
  const result = await runSupremeCommand('enable https');
  return result;
});

fastify.post('/api/ssl/disable', { preHandler: authenticateToken }, async (request, reply) => {
  const result = await runSupremeCommand('disable https');
  return result;
});

// System operations
fastify.post('/api/system/restart-apache', { preHandler: [authenticateToken, requireRole(['admin'])] }, async (request, reply) => {
  const result = await runSupremeCommand('restart');
  return result;
});

fastify.get('/api/system/health', { preHandler: authenticateToken }, async (request, reply) => {
  const result = await runSupremeCommand('doctor');
  return result;
});

// Logs endpoint
fastify.get('/api/logs', { preHandler: authenticateToken }, async (request, reply) => {
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
fastify.get('/api/system', { preHandler: authenticateToken }, async (request, reply) => {
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
fastify.get('/api/modules', { preHandler: authenticateToken }, async (request, reply) => {
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
fastify.post('/api/settings', { preHandler: authenticateToken }, async (request, reply) => {
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
fastify.get('/api/stats', { preHandler: authenticateToken }, async (request, reply) => {
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

// Database Management endpoints
fastify.get('/api/database/databases', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    console.log('📊 Database request received from user:', request.user.username);
    
    if (!dbInitialized) {
      console.log('⚠️ Database not initialized, returning mock data');
      // Fallback to mock data if database not initialized
      const databases = [
        { name: 'supreme_dev', size: '2.5 MB', created: '2024-01-15' },
        { name: 'test_db', size: '1.2 MB', created: '2024-01-20' },
        { name: 'project_alpha', size: '5.8 MB', created: '2024-02-01' }
      ];
      return { databases, mock: true };
    }
    
    console.log('🔍 Fetching real database data...');
    const databases = await getDatabases();
    console.log(`✅ Successfully fetched ${databases.length} databases`);
    return { databases, mock: false };
  } catch (error) {
    console.error('❌ Error fetching databases:', error.message);
    console.error('Stack trace:', error.stack);
    return reply.code(500).send({ error: 'Failed to fetch databases', details: error.message });
  }
});

fastify.get('/api/database/tables/:database', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const { database } = request.params;
    
    if (!dbInitialized) {
      // Fallback to mock data if database not initialized
      const tables = [
        { name: 'users', rows: 150, type: 'table' },
        { name: 'projects', rows: 25, type: 'table' },
        { name: 'logs', rows: 1200, type: 'table' },
        { name: 'settings', rows: 5, type: 'table' }
      ];
      return { tables, mock: true };
    }
    
    const tables = await getTables(database);
    return { tables, mock: false };
  } catch (error) {
    console.error('Error fetching tables:', error);
    return reply.code(500).send({ error: 'Failed to fetch tables' });
  }
});

fastify.post('/api/database/query', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const { database, query } = request.body;
    
    if (!database || !query) {
      return reply.code(400).send({ error: 'Database and query are required' });
    }
    
    if (!dbInitialized) {
      // Fallback to mock data if database not initialized
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      const executionTime = Date.now() - startTime;
      
      let rows = [];
      if (query.toLowerCase().includes('select')) {
        rows = [
          { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-15' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-01-16' },
          { id: 3, name: 'Bob Johnson', email: 'bob@example.com', created_at: '2024-01-17' }
        ];
      }
      
      return {
        success: true,
        rows,
        executionTime,
        affectedRows: rows.length,
        mock: true
      };
    }
    
    const result = await executeCustomQuery(database, query);
    return { ...result, mock: false };
  } catch (error) {
    console.error('Error executing query:', error);
    return reply.code(500).send({ error: 'Query execution failed' });
  }
});

fastify.get('/api/database/table-structure/:database/:table', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const { database, table } = request.params;
    
    if (!dbInitialized) {
      // Fallback to mock data if database not initialized
      const structure = {
        columns: [
          { name: 'id', type: 'INT', nullable: false, key: 'PRI', default: null },
          { name: 'name', type: 'VARCHAR(255)', nullable: false, key: '', default: null },
          { name: 'email', type: 'VARCHAR(255)', nullable: false, key: 'UNI', default: null },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false, key: '', default: 'CURRENT_TIMESTAMP' }
        ],
        indexes: [
          { name: 'PRIMARY', columns: ['id'], type: 'BTREE' },
          { name: 'email_unique', columns: ['email'], type: 'BTREE' }
        ],
        mock: true
      };
      return structure;
    }
    
    const structure = await getTableStructure(database, table);
    return { ...structure, mock: false };
  } catch (error) {
    console.error('Error fetching table structure:', error);
    return reply.code(500).send({ error: 'Failed to fetch table structure' });
  }
});

fastify.post('/api/database/create', { preHandler: [authenticateToken, requireRole(['admin'])] }, async (request, reply) => {
  try {
    const { name } = request.body;
    
    if (!name || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      return reply.code(400).send({ error: 'Invalid database name' });
    }
    
    if (!dbInitialized) {
      return {
        success: true,
        message: `Database '${name}' created successfully (mock)`,
        mock: true
      };
    }
    
    const result = await createDatabase(name);
    return { ...result, mock: false };
  } catch (error) {
    console.error('Error creating database:', error);
    return reply.code(500).send({ error: 'Failed to create database' });
  }
});

fastify.delete('/api/database/delete/:name', { preHandler: [authenticateToken, requireRole(['admin'])] }, async (request, reply) => {
  try {
    const { name } = request.params;
    
    if (!dbInitialized) {
      return {
        success: true,
        message: `Database '${name}' deleted successfully (mock)`,
        mock: true
      };
    }
    
    const result = await deleteDatabase(name);
    return { ...result, mock: false };
  } catch (error) {
    console.error('Error deleting database:', error);
    return reply.code(500).send({ error: 'Failed to delete database' });
  }
});

// Database status endpoint
fastify.get('/api/database/status', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    if (!dbInitialized) {
      return {
        connected: false,
        type: 'none',
        message: 'Database not initialized - using mock data'
      };
    }
    
    const status = await testConnection();
    return status;
  } catch (error) {
    console.error('Error checking database status:', error);
    return reply.code(500).send({ error: 'Failed to check database status' });
  }
});

// File Management endpoints
fastify.get('/api/files', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const { path } = request.query;
    
    if (!path) {
      return reply.code(400).send({ error: 'Path parameter is required' });
    }
    
    // Mock file list - In production, use fs.readdir
    const files = [
      {
        name: 'index.html',
        path: `${path}/index.html`,
        isDirectory: false,
        size: 1024,
        modified: new Date('2024-01-15T10:30:00Z')
      },
      {
        name: 'styles',
        path: `${path}/styles`,
        isDirectory: true,
        size: 0,
        modified: new Date('2024-01-15T10:30:00Z')
      },
      {
        name: 'scripts',
        path: `${path}/scripts`,
        isDirectory: true,
        size: 0,
        modified: new Date('2024-01-15T10:30:00Z')
      },
      {
        name: 'package.json',
        path: `${path}/package.json`,
        isDirectory: false,
        size: 512,
        modified: new Date('2024-01-15T10:30:00Z')
      }
    ];
    
    return { files };
  } catch (error) {
    return reply.code(500).send({ error: 'Failed to fetch files' });
  }
});

fastify.get('/api/files/content', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const { path } = request.query;
    
    if (!path) {
      return reply.code(400).send({ error: 'Path parameter is required' });
    }
    
    // Mock file content - In production, use fs.readFile
    const content = `// Mock file content for ${path}
console.log('Hello, World!');

function example() {
  return 'This is a sample file';
}

export default example;`;
    
    return { content };
  } catch (error) {
    return reply.code(500).send({ error: 'Failed to fetch file content' });
  }
});

fastify.post('/api/files/save', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const { path, content } = request.body;
    
    if (!path || content === undefined) {
      return reply.code(400).send({ error: 'Path and content are required' });
    }
    
    // Mock file save - In production, use fs.writeFile
    return {
      success: true,
      message: 'File saved successfully'
    };
  } catch (error) {
    return reply.code(500).send({ error: 'Failed to save file' });
  }
});

fastify.post('/api/files/create', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const { path, name, isDirectory } = request.body;
    
    if (!path || !name) {
      return reply.code(400).send({ error: 'Path and name are required' });
    }
    
    // Mock file/folder creation - In production, use fs.mkdir or fs.writeFile
    return {
      success: true,
      message: `${isDirectory ? 'Folder' : 'File'} created successfully`
    };
  } catch (error) {
    return reply.code(500).send({ error: 'Failed to create file/folder' });
  }
});

fastify.delete('/api/files/delete', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const { path } = request.body;
    
    if (!path) {
      return reply.code(400).send({ error: 'Path is required' });
    }
    
    // Mock file deletion - In production, use fs.unlink or fs.rmdir
    return {
      success: true,
      message: 'File/folder deleted successfully'
    };
  } catch (error) {
    return reply.code(500).send({ error: 'Failed to delete file/folder' });
  }
});

// Terminal endpoints
fastify.post('/api/terminal/execute', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const { command, directory, sessionId } = request.body;
    
    if (!command) {
      return reply.code(400).send({ error: 'Command is required' });
    }
    
    // Security: Only allow safe commands
    const allowedCommands = [
      'ls', 'pwd', 'cd', 'cat', 'grep', 'find', 'which', 'whoami',
      'supreme', 'git', 'npm', 'node', 'php', 'python', 'python3',
      'mkdir', 'touch', 'rm', 'cp', 'mv', 'chmod', 'chown',
      'ps', 'top', 'htop', 'df', 'du', 'free', 'uptime'
    ];
    
    const commandParts = command.trim().split(' ');
    const baseCommand = commandParts[0];
    
    if (!allowedCommands.includes(baseCommand)) {
      return {
        output: `Command '${baseCommand}' is not allowed for security reasons.`,
        error: 'Command not allowed',
        directory: directory
      };
    }
    
    // Mock command execution - In production, use child_process.exec
    const startTime = Date.now();
    
    // Simulate command execution time
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));
    
    const executionTime = Date.now() - startTime;
    
    // Mock responses based on command
    let output = '';
    let error = '';
    let newDirectory = directory;
    
    if (command.startsWith('ls')) {
      output = `total 8
drwxr-xr-x 2 supreme supreme 4096 Jan 15 10:30 .
drwxr-xr-x 3 supreme supreme 4096 Jan 15 10:30 ..
-rw-r--r-- 1 supreme supreme  512 Jan 15 10:30 index.html
-rw-r--r-- 1 supreme supreme 1024 Jan 15 10:30 package.json
drwxr-xr-x 2 supreme supreme 4096 Jan 15 10:30 src`;
    } else if (command.startsWith('pwd')) {
      output = directory;
    } else if (command.startsWith('cd ')) {
      const newPath = command.split(' ')[1];
      if (newPath === '..') {
        newDirectory = directory.split('/').slice(0, -1).join('/') || '/';
      } else if (newPath.startsWith('/')) {
        newDirectory = newPath;
      } else {
        newDirectory = directory.endsWith('/') ? directory + newPath : directory + '/' + newPath;
      }
      output = '';
    } else if (command.startsWith('supreme')) {
      if (command.includes('status')) {
        output = `Supreme Development Environment Status:
✅ Apache: Running
✅ MySQL: Running  
✅ PHP: Running (8.2.0)
✅ Node.js: Running (18.17.0)
✅ SSL: Enabled
✅ Projects: 3 active`;
      } else if (command.includes('doctor')) {
        output = `Supreme System Health Check:
🔍 Checking system requirements...
✅ All dependencies installed
✅ Configuration valid
✅ Services running
✅ No issues found`;
      } else {
        output = `Supreme CLI v2.0.0
Usage: supreme [command]

Available commands:
  status     - Show system status
  doctor     - Run system health check
  restart    - Restart services
  projects   - List projects
  ssl        - Manage SSL certificates`;
      }
    } else if (command.startsWith('git')) {
      if (command.includes('status')) {
        output = `On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean`;
      } else {
        output = `Git version 2.34.1
Usage: git [command]`;
      }
    } else if (command.startsWith('npm')) {
      if (command.includes('list')) {
        output = `supreme-dashboard@1.0.0 /var/www/html
├── react@18.2.0
├── react-dom@18.2.0
├── react-router-dom@6.20.1
├── chart.js@4.4.0
└── react-chartjs-2@5.2.0`;
      } else {
        output = `npm version 9.6.7
Usage: npm [command]`;
      }
    } else {
      output = `Command executed: ${command}
Execution time: ${executionTime}ms
Directory: ${directory}`;
    }
    
    return {
      output,
      error,
      directory: newDirectory,
      executionTime
    };
  } catch (error) {
    return reply.code(500).send({ error: 'Command execution failed' });
  }
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
