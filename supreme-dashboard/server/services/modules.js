import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class ModulesService {
  constructor() {
    // Get the correct path to supreme modules (go up two directories from server)
    const serverDir = path.dirname(path.dirname(process.cwd()));
    this.modulesPath = path.join(serverDir, 'supreme/modules');
    this.configPath = path.join(serverDir, 'supreme');
    this.modules = new Map();
    this.initializeModules();
    
    // Log the paths for debugging
    console.log('Modules service initialized:');
    console.log('Modules path:', this.modulesPath);
    console.log('Config path:', this.configPath);
  }

  initializeModules() {
    // Define available modules with their metadata
    this.modules.set('platform', {
      id: 'platform',
      name: 'Platform Detection',
      version: '2.0.0',
      description: 'Cross-platform detection and configuration',
      file: 'platform.sh',
      dependencies: [],
      status: 'active',
      lastUpdated: new Date().toISOString(),
      health: 'healthy',
      features: ['Platform detection', 'Apache configuration', 'Database detection']
    });

    this.modules.set('ssl', {
      id: 'ssl',
      name: 'SSL Management',
      version: '2.0.0',
      description: 'SSL certificate generation and management',
      file: 'ssl.sh',
      dependencies: ['mkcert'],
      status: 'active',
      lastUpdated: new Date().toISOString(),
      health: 'healthy',
      features: ['Certificate generation', 'Wildcard certificates', 'CA installation']
    });

    this.modules.set('database', {
      id: 'database',
      name: 'Database Operations',
      version: '2.0.0',
      description: 'Database creation, management, and health checks',
      file: 'database.sh',
      dependencies: ['mysql', 'postgresql'],
      status: 'active',
      lastUpdated: new Date().toISOString(),
      health: 'healthy',
      features: ['Database creation', 'Import/Export', 'Health checks']
    });

    this.modules.set('projects', {
      id: 'projects',
      name: 'Project Management',
      version: '2.0.0',
      description: 'Framework-specific project creation and management',
      file: 'projects.sh',
      dependencies: ['composer', 'node', 'python3'],
      status: 'active',
      lastUpdated: new Date().toISOString(),
      health: 'healthy',
      features: ['Laravel projects', 'React/Vue/Angular', 'Django/Flask', 'WordPress']
    });

    this.modules.set('dependencies', {
      id: 'dependencies',
      name: 'Dependency Manager',
      version: '2.0.0',
      description: 'Smart dependency detection and installation',
      file: 'dependencies.sh',
      dependencies: [],
      status: 'active',
      lastUpdated: new Date().toISOString(),
      health: 'healthy',
      features: ['XAMPP detection', 'Package management', 'Auto-installation']
    });

    this.modules.set('sync', {
      id: 'sync',
      name: 'Cloud Sync',
      version: '2.0.0',
      description: 'Configuration and SSL certificate cloud synchronization',
      file: 'sync.sh',
      dependencies: ['git'],
      status: 'inactive',
      lastUpdated: new Date().toISOString(),
      health: 'unknown',
      features: ['GitHub sync', 'GitLab sync', 'Encrypted storage']
    });
  }

  async getAllModules() {
    try {
      const modules = Array.from(this.modules.values());
      const total = modules.length;
      const active = modules.filter(m => m.status === 'active').length;
      const inactive = modules.filter(m => m.status === 'inactive').length;

      return {
        modules,
        total,
        active,
        inactive
      };
    } catch (error) {
      console.error('Error getting all modules:', error);
      return {
        modules: [],
        total: 0,
        active: 0,
        inactive: 0
      };
    }
  }

  async getModuleById(id) {
    try {
      const module = this.modules.get(id);
      if (!module) {
        throw new Error(`Module ${id} not found`);
      }

      // Check if module file exists
      const modulePath = path.join(this.modulesPath, module.file);
      try {
        await fs.access(modulePath);
        module.fileExists = true;
      } catch (error) {
        module.fileExists = false;
        module.health = 'error';
      }

      // Check dependencies
      try {
        module.dependencyStatus = await this.checkDependencies(module.dependencies);
      } catch (error) {
        console.error('Error checking dependencies:', error);
        module.dependencyStatus = {};
      }

      return module;
    } catch (error) {
      console.error('Error getting module by ID:', error);
      throw error;
    }
  }

  async checkDependencies(dependencies) {
    const status = {};
    
    for (const dep of dependencies) {
      try {
        await execAsync(`which ${dep}`);
        status[dep] = { 
          installed: true, 
          status: 'available',
          version: await this.getDependencyVersion(dep)
        };
      } catch (error) {
        status[dep] = { 
          installed: false, 
          status: 'missing',
          version: null,
          installCommand: this.getInstallCommand(dep)
        };
      }
    }
    
    return status;
  }

  async getDependencyVersion(dep) {
    try {
      const { stdout } = await execAsync(`${dep} --version`);
      return stdout.trim().split('\n')[0];
    } catch (error) {
      try {
        const { stdout } = await execAsync(`${dep} -v`);
        return stdout.trim().split('\n')[0];
      } catch (error2) {
        return 'Unknown';
      }
    }
  }

  getInstallCommand(dep) {
    const installCommands = {
      'mkcert': 'curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64" && chmod +x mkcert-v*-linux-amd64 && sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert',
      'composer': 'curl -sS https://getcomposer.org/installer | php && sudo mv composer.phar /usr/local/bin/composer',
      'node': 'curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs',
      'npm': 'curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs',
      'python3': 'sudo apt-get update && sudo apt-get install -y python3 python3-pip',
      'pip': 'sudo apt-get update && sudo apt-get install -y python3-pip',
      'docker': 'curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh',
      'git': 'sudo apt-get update && sudo apt-get install -y git',
      'mysql': 'sudo apt-get update && sudo apt-get install -y mysql-server',
      'postgresql': 'sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib',
      'php': 'sudo apt-get update && sudo apt-get install -y php php-cli php-fpm php-mysql php-curl php-gd php-mbstring php-xml php-zip'
    };

    return installCommands[dep] || `sudo apt-get install -y ${dep}`;
  }

  async installDependency(dep) {
    const installCommand = this.getInstallCommand(dep);
    
    try {
      const { stdout, stderr } = await execAsync(installCommand);
      return {
        success: true,
        output: stdout,
        error: stderr,
        command: installCommand
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        command: installCommand
      };
    }
  }

  async installModuleDependencies(moduleId) {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }

    const results = [];
    const missingDeps = [];

    // Check which dependencies are missing
    const depStatus = await this.checkDependencies(module.dependencies);
    for (const [dep, status] of Object.entries(depStatus)) {
      if (!status.installed) {
        missingDeps.push(dep);
      }
    }

    // Install missing dependencies
    for (const dep of missingDeps) {
      const result = await this.installDependency(dep);
      results.push({
        dependency: dep,
        ...result
      });
    }

    return {
      module: moduleId,
      dependencies: module.dependencies,
      results,
      success: results.every(r => r.success)
    };
  }

  async enableModule(id) {
    const module = this.modules.get(id);
    if (!module) {
      throw new Error(`Module ${id} not found`);
    }

    // Check if module file exists
    const modulePath = path.join(this.modulesPath, module.file);
    try {
      await fs.access(modulePath);
    } catch (error) {
      throw new Error(`Module file not found: ${module.file}`);
    }

    // Check dependencies
    const depStatus = await this.checkDependencies(module.dependencies);
    const missingDeps = Object.entries(depStatus)
      .filter(([_, status]) => !status.installed)
      .map(([dep, _]) => dep);

    if (missingDeps.length > 0) {
      throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
    }

    module.status = 'active';
    module.lastUpdated = new Date().toISOString();
    module.health = 'healthy';

    return module;
  }

  async disableModule(id) {
    const module = this.modules.get(id);
    if (!module) {
      throw new Error(`Module ${id} not found`);
    }

    module.status = 'inactive';
    module.lastUpdated = new Date().toISOString();
    module.health = 'disabled';

    return module;
  }

  async getModuleHealth(id) {
    const module = this.modules.get(id);
    if (!module) {
      throw new Error(`Module ${id} not found`);
    }

    const health = {
      module: id,
      status: module.status,
      health: module.health,
      fileExists: false,
      dependencies: {},
      checks: [],
      lastChecked: new Date().toISOString()
    };

    // Check if module file exists
    const modulePath = path.join(this.modulesPath, module.file);
    try {
      await fs.access(modulePath);
      health.fileExists = true;
      health.checks.push({
        name: 'File Exists',
        status: 'pass',
        message: 'Module file found'
      });
    } catch (error) {
      health.fileExists = false;
      health.health = 'error';
      health.checks.push({
        name: 'File Exists',
        status: 'fail',
        message: 'Module file not found'
      });
    }

    // Check dependencies
    health.dependencies = await this.checkDependencies(module.dependencies);
    
    // Add dependency checks
    const depStatus = health.dependencies;
    const missingDeps = Object.entries(depStatus)
      .filter(([_, status]) => !status.installed);

    if (missingDeps.length === 0) {
      health.checks.push({
        name: 'Dependencies',
        status: 'pass',
        message: 'All dependencies available'
      });
    } else {
      health.checks.push({
        name: 'Dependencies',
        status: 'fail',
        message: `Missing dependencies: ${missingDeps.map(([dep]) => dep).join(', ')}`
      });
    }

    // Check module syntax
    if (health.fileExists) {
      try {
        await execAsync(`bash -n ${modulePath}`);
        health.checks.push({
          name: 'Syntax Check',
          status: 'pass',
          message: 'Module syntax is valid'
        });
      } catch (error) {
        health.checks.push({
          name: 'Syntax Check',
          status: 'fail',
          message: 'Module syntax error'
        });
      }
    }

    // Check module permissions
    if (health.fileExists) {
      try {
        const stats = await fs.stat(modulePath);
        const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
        if (isExecutable) {
          health.checks.push({
            name: 'Permissions',
            status: 'pass',
            message: 'Module is executable'
          });
        } else {
          health.checks.push({
            name: 'Permissions',
            status: 'warn',
            message: 'Module is not executable'
          });
        }
      } catch (error) {
        health.checks.push({
          name: 'Permissions',
          status: 'fail',
          message: 'Cannot check module permissions'
        });
      }
    }

    // Overall health assessment
    const failedChecks = health.checks.filter(check => check.status === 'fail');
    const warningChecks = health.checks.filter(check => check.status === 'warn');
    
    if (failedChecks.length > 0) {
      health.health = 'error';
    } else if (warningChecks.length > 0) {
      health.health = 'warning';
    } else {
      health.health = 'healthy';
    }

    return health;
  }

  async getModuleLogs(id, lines = 50) {
    // In a real implementation, this would read from log files
    // For now, return mock log data
    const logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Module ${id} initialized successfully`,
        module: id
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'info',
        message: `Module ${id} health check passed`,
        module: id
      }
    ];

    return logs.slice(-lines);
  }

  async testModule(id) {
    const module = this.modules.get(id);
    if (!module) {
      throw new Error(`Module ${id} not found`);
    }

    const testResults = {
      module: id,
      timestamp: new Date().toISOString(),
      tests: [],
      performance: {}
    };

    const startTime = Date.now();

    // Test 1: File existence
    const modulePath = path.join(this.modulesPath, module.file);
    try {
      await fs.access(modulePath);
      testResults.tests.push({
        name: 'File Exists',
        status: 'pass',
        message: 'Module file found',
        duration: Date.now() - startTime
      });
    } catch (error) {
      testResults.tests.push({
        name: 'File Exists',
        status: 'fail',
        message: 'Module file not found',
        duration: Date.now() - startTime
      });
    }

    // Test 2: Dependencies
    const depStartTime = Date.now();
    const depStatus = await this.checkDependencies(module.dependencies);
    const missingDeps = Object.entries(depStatus)
      .filter(([_, status]) => !status.installed);

    if (missingDeps.length === 0) {
      testResults.tests.push({
        name: 'Dependencies',
        status: 'pass',
        message: 'All dependencies available',
        duration: Date.now() - depStartTime,
        details: depStatus
      });
    } else {
      testResults.tests.push({
        name: 'Dependencies',
        status: 'fail',
        message: `Missing dependencies: ${missingDeps.map(([dep]) => dep).join(', ')}`,
        duration: Date.now() - depStartTime,
        details: depStatus
      });
    }

    // Test 3: Module syntax (basic check)
    const syntaxStartTime = Date.now();
    try {
      await execAsync(`bash -n ${modulePath}`);
      testResults.tests.push({
        name: 'Syntax Check',
        status: 'pass',
        message: 'Module syntax is valid',
        duration: Date.now() - syntaxStartTime
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Syntax Check',
        status: 'fail',
        message: 'Module syntax error',
        duration: Date.now() - syntaxStartTime,
        error: error.message
      });
    }

    // Test 4: Module permissions
    const permStartTime = Date.now();
    try {
      const stats = await fs.stat(modulePath);
      const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
      if (isExecutable) {
        testResults.tests.push({
          name: 'Permissions',
          status: 'pass',
          message: 'Module is executable',
          duration: Date.now() - permStartTime
        });
      } else {
        testResults.tests.push({
          name: 'Permissions',
          status: 'warn',
          message: 'Module is not executable',
          duration: Date.now() - permStartTime
        });
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Permissions',
        status: 'fail',
        message: 'Cannot check module permissions',
        duration: Date.now() - permStartTime,
        error: error.message
      });
    }

    // Test 5: Module function availability (if module is loaded)
    const funcStartTime = Date.now();
    try {
      // Check if module functions are available by sourcing the file
      const { stdout, stderr } = await execAsync(`bash -c "source ${modulePath} && declare -f"`);
      const functions = stdout.split('\n').filter(line => line.startsWith('declare -f'));
      
      if (functions.length > 0) {
        testResults.tests.push({
          name: 'Function Availability',
          status: 'pass',
          message: `Found ${functions.length} functions`,
          duration: Date.now() - funcStartTime,
          details: functions.map(f => f.replace('declare -f ', ''))
        });
      } else {
        testResults.tests.push({
          name: 'Function Availability',
          status: 'warn',
          message: 'No functions found in module',
          duration: Date.now() - funcStartTime
        });
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Function Availability',
        status: 'fail',
        message: 'Cannot check module functions',
        duration: Date.now() - funcStartTime,
        error: error.message
      });
    }

    // Test 6: Module integration test (basic functionality)
    const integrationStartTime = Date.now();
    try {
      // Try to run a basic test command for each module type
      let testCommand = '';
      switch (id) {
        case 'platform':
          testCommand = `bash -c "source ${modulePath} && detect_platform"`;
          break;
        case 'ssl':
          testCommand = `bash -c "source ${modulePath} && check_certificate_status"`;
          break;
        case 'database':
          testCommand = `bash -c "source ${modulePath} && check_database_health"`;
          break;
        case 'projects':
          testCommand = `bash -c "source ${modulePath} && get_project_status test"`;
          break;
        case 'dependencies':
          testCommand = `bash -c "source ${modulePath} && check_dependency git"`;
          break;
        case 'sync':
          testCommand = `bash -c "source ${modulePath} && sync_status"`;
          break;
        default:
          testCommand = `bash -c "source ${modulePath} && echo 'Module loaded successfully'"`;
      }

      const { stdout, stderr } = await execAsync(testCommand);
      testResults.tests.push({
        name: 'Integration Test',
        status: 'pass',
        message: 'Module integration test passed',
        duration: Date.now() - integrationStartTime,
        output: stdout.trim()
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Integration Test',
        status: 'fail',
        message: 'Module integration test failed',
        duration: Date.now() - integrationStartTime,
        error: error.message
      });
    }

    // Performance metrics
    testResults.performance = {
      totalDuration: Date.now() - startTime,
      averageTestDuration: testResults.tests.reduce((sum, test) => sum + test.duration, 0) / testResults.tests.length,
      slowestTest: testResults.tests.reduce((max, test) => test.duration > max.duration ? test : max, testResults.tests[0])
    };

    // Overall assessment
    const failedTests = testResults.tests.filter(test => test.status === 'fail');
    const warningTests = testResults.tests.filter(test => test.status === 'warn');
    
    if (failedTests.length > 0) {
      testResults.overall = 'fail';
      testResults.summary = `${failedTests.length} test(s) failed, ${warningTests.length} warning(s)`;
    } else if (warningTests.length > 0) {
      testResults.overall = 'warn';
      testResults.summary = `All tests passed with ${warningTests.length} warning(s)`;
    } else {
      testResults.overall = 'pass';
      testResults.summary = 'All tests passed successfully';
    }

    return testResults;
  }

  async getModuleConfiguration(id) {
    const module = this.modules.get(id);
    if (!module) {
      throw new Error(`Module ${id} not found`);
    }

    // Return module-specific configuration options
    const configs = {
      platform: {
        autoDetect: true,
        preferredApache: 'xampp',
        preferredDatabase: 'mysql'
      },
      ssl: {
        autoRenew: true,
        wildcardDomain: 'localhost',
        encryptionLevel: 'high'
      },
      database: {
        defaultType: 'mysql',
        autoBackup: true,
        backupRetention: 30
      },
      projects: {
        defaultFramework: 'laravel',
        autoCreateDatabase: true,
        enableSSL: true
      },
      dependencies: {
        autoInstall: true,
        preferXAMPP: true,
        checkUpdates: true
      },
      sync: {
        backend: 'none',
        encryption: true,
        autoSync: false
      }
    };

    return {
      module: id,
      configuration: configs[id] || {},
      lastModified: new Date().toISOString()
    };
  }

  async updateModuleConfiguration(id, config) {
    const module = this.modules.get(id);
    if (!module) {
      throw new Error(`Module ${id} not found`);
    }

    // In a real implementation, this would save to a config file
    // For now, just return success
    return {
      module: id,
      configuration: config,
      updated: new Date().toISOString(),
      success: true
    };
  }

  // Module monitoring and alerting
  async getModuleMetrics(id) {
    const module = this.modules.get(id);
    if (!module) {
      throw new Error(`Module ${id} not found`);
    }

    const metrics = {
      module: id,
      timestamp: new Date().toISOString(),
      uptime: this.calculateUptime(module),
      performance: await this.getModulePerformance(id),
      errors: await this.getModuleErrors(id),
      usage: await this.getModuleUsage(id)
    };

    return metrics;
  }

  calculateUptime(module) {
    // Calculate uptime based on module status and last updated
    const now = new Date();
    const lastUpdated = new Date(module.lastUpdated);
    const uptimeMs = now - lastUpdated;
    
    return {
      seconds: Math.floor(uptimeMs / 1000),
      human: this.formatUptime(uptimeMs)
    };
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  async getModulePerformance(id) {
    // Mock performance metrics
    return {
      cpuUsage: Math.random() * 10,
      memoryUsage: Math.random() * 50,
      responseTime: Math.random() * 100,
      throughput: Math.random() * 1000
    };
  }

  async getModuleErrors(id) {
    // Mock error data
    return {
      total: Math.floor(Math.random() * 10),
      last24h: Math.floor(Math.random() * 5),
      critical: Math.floor(Math.random() * 2),
      warnings: Math.floor(Math.random() * 8)
    };
  }

  async getModuleUsage(id) {
    // Mock usage data
    return {
      requests: Math.floor(Math.random() * 1000),
      uniqueUsers: Math.floor(Math.random() * 100),
      avgSessionTime: Math.floor(Math.random() * 300),
      peakUsage: Math.floor(Math.random() * 500)
    };
  }

  // Bulk health check for all modules
  async getAllModulesHealth() {
    const healthChecks = [];
    
    for (const [id, module] of this.modules) {
      try {
        const health = await this.getModuleHealth(id);
        healthChecks.push(health);
      } catch (error) {
        healthChecks.push({
          module: id,
          status: 'error',
          health: 'error',
          error: error.message,
          lastChecked: new Date().toISOString()
        });
      }
    }

    const summary = {
      total: healthChecks.length,
      healthy: healthChecks.filter(h => h.health === 'healthy').length,
      warning: healthChecks.filter(h => h.health === 'warning').length,
      error: healthChecks.filter(h => h.health === 'error').length,
      lastChecked: new Date().toISOString()
    };

    return {
      summary,
      modules: healthChecks
    };
  }

  // Module alerts and notifications
  async checkModuleAlerts() {
    const alerts = [];
    const healthChecks = await this.getAllModulesHealth();

    for (const health of healthChecks.modules) {
      if (health.health === 'error') {
        alerts.push({
          type: 'error',
          module: health.module,
          message: `Module ${health.module} is in error state`,
          timestamp: new Date().toISOString(),
          severity: 'high'
        });
      } else if (health.health === 'warning') {
        alerts.push({
          type: 'warning',
          module: health.module,
          message: `Module ${health.module} has warnings`,
          timestamp: new Date().toISOString(),
          severity: 'medium'
        });
      }
    }

    return alerts;
  }
}

export default new ModulesService();
