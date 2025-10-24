import mysql from 'mysql2/promise';
import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync, existsSync } from 'fs';

// Database connection configuration
let dbConfig = null;
let connectionPool = null;
let dbType = null; // 'mysql' or 'postgresql'

// Load database configuration from Supreme config
const loadDatabaseConfig = () => {
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
      
      // Detect database type from config or command
      const dbCommand = config.DB_CMD || '';
      if (dbCommand.includes('psql') || config.DB_TYPE === 'postgresql') {
        dbType = 'postgresql';
        dbConfig = {
          host: config.DB_HOST || 'localhost',
          port: parseInt(config.DB_PORT) || 5432,
          user: config.DB_ROOT_USER || 'postgres',
          password: config.DB_ROOT_PASSWORD === 'REQUIRED' ? '' : (config.DB_ROOT_PASSWORD || ''),
          database: 'postgres', // Default to postgres for listing databases
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        };
      } else {
        dbType = 'mysql';
        dbConfig = {
          host: config.DB_HOST || 'localhost',
          port: parseInt(config.DB_PORT) || 3306,
          user: config.DB_ROOT_USER || 'root',
          password: config.DB_ROOT_PASSWORD === 'REQUIRED' ? '' : (config.DB_ROOT_PASSWORD || ''),
          database: 'mysql', // Use mysql database instead of information_schema
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0
        };
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error loading database config:', error);
    return false;
  }
};

// Initialize database connection pool
export const initializeDatabase = () => {
  if (loadDatabaseConfig()) {
    try {
      if (dbType === 'postgresql') {
        connectionPool = new Pool(dbConfig);
        console.log('✅ PostgreSQL connection pool initialized');
      } else {
        // For MySQL, try connecting without a specific database first
        const testConfig = { ...dbConfig };
        delete testConfig.database;
        connectionPool = mysql.createPool(testConfig);
        console.log('✅ MySQL connection pool initialized');
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize database connection pool:', error);
      return false;
    }
  } else {
    console.warn('⚠️ Database configuration not found, using mock data');
    return false;
  }
};

// Get database connection
export const getConnection = () => {
  if (!connectionPool) {
    throw new Error('Database not initialized');
  }
  return connectionPool;
};

// Execute query with error handling
export const executeQuery = async (query, params = []) => {
  if (!connectionPool) {
    throw new Error('Database not initialized');
  }
  
  try {
    if (dbType === 'postgresql') {
      const result = await connectionPool.query(query, params);
      return result.rows;
    } else {
      const [rows] = await connectionPool.execute(query, params);
      return rows;
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Get list of databases
export const getDatabases = async () => {
  try {
    console.log(`🔍 Getting databases for ${dbType}...`);
    let query, databases;
    
    if (dbType === 'postgresql') {
      query = `
        SELECT 
          datname as name,
          pg_size_pretty(pg_database_size(datname)) as size,
          datcreated as created
        FROM pg_database 
        WHERE datistemplate = false
        AND datname NOT IN ('postgres', 'template0', 'template1')
        ORDER BY datname
      `;
    } else {
      // Use a simpler query for MySQL
      query = `SHOW DATABASES`;
    }
    
    console.log('📝 Executing query:', query.substring(0, 50) + '...');
    databases = await executeQuery(query);
    console.log(`📊 Query returned ${databases.length} results`);
    
    if (dbType === 'postgresql') {
      return databases.map(db => ({
        name: db.name,
        size: db.size,
        created: db.created ? new Date(db.created).toISOString().split('T')[0] : 'Unknown'
      }));
    } else {
      // Filter out system databases for MySQL
      const filtered = databases
        .filter(db => !['information_schema', 'mysql', 'performance_schema', 'phpmyadmin', 'test'].includes(db.Database))
        .map(db => ({
          name: db.Database,
          size: 'Unknown',
          created: 'Unknown'
        }));
      console.log(`🔍 Filtered to ${filtered.length} user databases`);
      return filtered;
    }
  } catch (error) {
    console.error('❌ Error in getDatabases:', error.message);
    console.error('Database type:', dbType);
    console.error('Connection pool status:', connectionPool ? 'initialized' : 'not initialized');
    throw error;
  }
};

// Get tables for a specific database
export const getTables = async (databaseName) => {
  try {
    let query, tables;
    
    if (dbType === 'postgresql') {
      // For PostgreSQL, we need to connect to the specific database
      const tempPool = new Pool({
        ...dbConfig,
        database: databaseName
      });
      
      query = `
        SELECT 
          tablename as name,
          COALESCE(n_tup_ins - n_tup_del, 0) as "rows",
          'table' as type,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables t
        LEFT JOIN pg_stat_user_tables s ON t.tablename = s.relname
        WHERE schemaname = 'public'
        ORDER BY tablename
      `;
      
      const result = await tempPool.query(query);
      tables = result.rows;
      await tempPool.end();
    } else {
      query = `
        SELECT 
          TABLE_NAME as name,
          TABLE_ROWS as \`rows\`,
          TABLE_TYPE as type,
          ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as size_mb
        FROM information_schema.tables 
        WHERE table_schema = ?
        ORDER BY TABLE_NAME
      `;
      
      tables = await executeQuery(query, [databaseName]);
    }
    
    return tables.map(table => ({
      name: table.name,
      rows: table.rows || 0,
      type: dbType === 'postgresql' ? 'table' : (table.type === 'BASE TABLE' ? 'table' : table.type),
      size: dbType === 'postgresql' ? table.size : (table.size_mb ? `${table.size_mb} MB` : 'Unknown')
    }));
  } catch (error) {
    console.error('Error fetching tables:', error);
    throw error;
  }
};

// Execute custom SQL query
export const executeCustomQuery = async (databaseName, query) => {
  try {
    const startTime = Date.now();
    let result;
    
    if (dbType === 'postgresql') {
      // For PostgreSQL, create a temporary connection to the specific database
      const tempPool = new Pool({
        ...dbConfig,
        database: databaseName
      });
      
      const queryResult = await tempPool.query(query);
      result = queryResult.rows;
      await tempPool.end();
    } else {
      // For MySQL, first switch to the specified database
      await executeQuery(`USE \`${databaseName}\``);
      result = await executeQuery(query);
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      success: true,
      rows: result,
      executionTime,
      affectedRows: result.affectedRows || result.length
    };
  } catch (error) {
    console.error('Error executing custom query:', error);
    throw error;
  }
};

// Get table structure
export const getTableStructure = async (databaseName, tableName) => {
  try {
    console.log(`🔍 Getting table structure for ${databaseName}.${tableName}...`);
    let columns, indexes;
    
    if (dbType === 'postgresql') {
      // For PostgreSQL, create a temporary connection to the specific database
      const tempPool = new Pool({
        ...dbConfig,
        database: databaseName
      });
      
      const columnQuery = `
        SELECT 
          column_name as name,
          data_type as type,
          is_nullable as nullable,
          column_default as default_value,
          character_maximum_length as max_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `;
      
      const indexQuery = `
        SELECT 
          indexname as name,
          array_to_string(array_agg(attname ORDER BY attnum), ',') as columns,
          indexdef as definition
        FROM pg_indexes i
        JOIN pg_class c ON c.relname = i.indexname
        JOIN pg_attribute a ON a.attrelid = c.oid
        WHERE i.tablename = $1
        GROUP BY indexname, indexdef
        ORDER BY indexname
      `;
      
      const columnResult = await tempPool.query(columnQuery, [tableName]);
      const indexResult = await tempPool.query(indexQuery, [tableName]);
      
      columns = columnResult.rows;
      indexes = indexResult.rows;
      
      await tempPool.end();
    } else {
      // For MySQL, create a temporary connection to the specific database
      const tempConfig = { ...dbConfig };
      tempConfig.database = databaseName;
      const tempPool = mysql.createPool(tempConfig);
      
      const query = `
        SELECT 
          COLUMN_NAME as name,
          DATA_TYPE as type,
          IS_NULLABLE as nullable,
          COLUMN_KEY as \`key\`,
          COLUMN_DEFAULT as default_value,
          EXTRA as extra,
          CHARACTER_MAXIMUM_LENGTH as max_length
        FROM information_schema.columns 
        WHERE table_schema = ? AND table_name = ?
        ORDER BY ORDINAL_POSITION
      `;
      
      console.log(`📝 Executing column query for table: ${tableName}`);
      const [columnRows] = await tempPool.execute(query, [databaseName, tableName]);
      columns = columnRows;
      console.log(`📊 Found ${columns.length} columns`);
      
      // Get indexes
      const indexQuery = `
        SELECT 
          INDEX_NAME as name,
          GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns,
          INDEX_TYPE as type,
          NON_UNIQUE as non_unique
        FROM information_schema.statistics 
        WHERE table_schema = ? AND table_name = ?
        GROUP BY INDEX_NAME, INDEX_TYPE, NON_UNIQUE
        ORDER BY INDEX_NAME
      `;
      
      console.log(`📝 Executing index query for table: ${tableName}`);
      const [indexRows] = await tempPool.execute(indexQuery, [databaseName, tableName]);
      indexes = indexRows;
      console.log(`📊 Found ${indexes.length} indexes`);
      
      await tempPool.end();
    }
    
    const result = {
      columns: columns.map(col => ({
        name: col.name,
        type: col.max_length ? `${col.type}(${col.max_length})` : col.type,
        nullable: col.nullable === 'YES' || col.nullable === true,
        key: col.key || '',
        default: col.default_value,
        extra: col.extra || ''
      })),
      indexes: indexes.map(idx => ({
        name: idx.name,
        columns: idx.columns ? idx.columns.split(',') : [],
        type: idx.type || 'BTREE',
        unique: dbType === 'postgresql' ? idx.definition?.includes('UNIQUE') : !idx.non_unique
      }))
    };
    
    console.log(`✅ Successfully retrieved table structure: ${result.columns.length} columns, ${result.indexes.length} indexes`);
    return result;
  } catch (error) {
    console.error('❌ Error in getTableStructure:', error.message);
    console.error('Database type:', dbType);
    console.error('Database name:', databaseName);
    console.error('Table name:', tableName);
    throw error;
  }
};

// Create database
export const createDatabase = async (databaseName) => {
  try {
    let query;
    if (dbType === 'postgresql') {
      query = `CREATE DATABASE "${databaseName}"`;
    } else {
      query = `CREATE DATABASE IF NOT EXISTS \`${databaseName}\``;
    }
    await executeQuery(query);
    return { success: true, message: `Database '${databaseName}' created successfully` };
  } catch (error) {
    console.error('Error creating database:', error);
    throw error;
  }
};

// Delete database
export const deleteDatabase = async (databaseName) => {
  try {
    let query;
    if (dbType === 'postgresql') {
      query = `DROP DATABASE IF EXISTS "${databaseName}"`;
    } else {
      query = `DROP DATABASE IF EXISTS \`${databaseName}\``;
    }
    await executeQuery(query);
    return { success: true, message: `Database '${databaseName}' deleted successfully` };
  } catch (error) {
    console.error('Error deleting database:', error);
    throw error;
  }
};

// Create table
export const createTable = async (databaseName, tableName, tableSchema) => {
  try {
    let query;
    if (dbType === 'postgresql') {
      query = `CREATE TABLE "${tableName}" (${tableSchema})`;
    } else {
      query = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${tableSchema})`;
    }
    
    // Switch to the specific database for table creation
    const originalConfig = { ...dbConfig };
    if (dbType === 'postgresql') {
      dbConfig.database = databaseName;
    } else {
      dbConfig.database = databaseName;
    }
    
    // Reinitialize connection with the specific database
    if (dbType === 'postgresql') {
      connectionPool = new Pool(dbConfig);
    } else {
      connectionPool = mysql.createPool(dbConfig);
    }
    
    await executeQuery(query);
    
    // Restore original config
    Object.assign(dbConfig, originalConfig);
    if (dbType === 'postgresql') {
      connectionPool = new Pool(dbConfig);
    } else {
      connectionPool = mysql.createPool(dbConfig);
    }
    
    return { success: true, message: `Table '${tableName}' created successfully in database '${databaseName}'` };
  } catch (error) {
    console.error('Error creating table:', error);
    throw error;
  }
};

// Delete table
export const deleteTable = async (databaseName, tableName) => {
  try {
    let query;
    if (dbType === 'postgresql') {
      query = `DROP TABLE IF EXISTS "${tableName}"`;
    } else {
      query = `DROP TABLE IF EXISTS \`${tableName}\``;
    }
    
    // Switch to the specific database for table deletion
    const originalConfig = { ...dbConfig };
    if (dbType === 'postgresql') {
      dbConfig.database = databaseName;
    } else {
      dbConfig.database = databaseName;
    }
    
    // Reinitialize connection with the specific database
    if (dbType === 'postgresql') {
      connectionPool = new Pool(dbConfig);
    } else {
      connectionPool = mysql.createPool(dbConfig);
    }
    
    await executeQuery(query);
    
    // Restore original config
    Object.assign(dbConfig, originalConfig);
    if (dbType === 'postgresql') {
      connectionPool = new Pool(dbConfig);
    } else {
      connectionPool = mysql.createPool(dbConfig);
    }
    
    return { success: true, message: `Table '${tableName}' deleted successfully from database '${databaseName}'` };
  } catch (error) {
    console.error('Error deleting table:', error);
    throw error;
  }
};

// Get table templates
export const getTableTemplates = () => {
  return {
    users: {
      name: 'Users',
      description: 'Basic user table with authentication fields',
      schema: dbType === 'postgresql' 
        ? 'id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, email VARCHAR(100) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, first_name VARCHAR(50), last_name VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
        : 'id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, email VARCHAR(100) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, first_name VARCHAR(50), last_name VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    },
    posts: {
      name: 'Posts',
      description: 'Blog posts table with content and metadata',
      schema: dbType === 'postgresql'
        ? 'id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, content TEXT, slug VARCHAR(255) UNIQUE, author_id INTEGER, status VARCHAR(20) DEFAULT \'draft\', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
        : 'id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255) NOT NULL, content TEXT, slug VARCHAR(255) UNIQUE, author_id INT, status VARCHAR(20) DEFAULT \'draft\', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    },
    products: {
      name: 'Products',
      description: 'E-commerce products table',
      schema: dbType === 'postgresql'
        ? 'id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, price DECIMAL(10,2) NOT NULL, sku VARCHAR(100) UNIQUE, category_id INTEGER, stock_quantity INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
        : 'id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, price DECIMAL(10,2) NOT NULL, sku VARCHAR(100) UNIQUE, category_id INT, stock_quantity INT DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    },
    orders: {
      name: 'Orders',
      description: 'Order management table',
      schema: dbType === 'postgresql'
        ? 'id SERIAL PRIMARY KEY, order_number VARCHAR(50) UNIQUE NOT NULL, customer_id INTEGER, total_amount DECIMAL(10,2) NOT NULL, status VARCHAR(20) DEFAULT \'pending\', shipping_address TEXT, billing_address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
        : 'id INT AUTO_INCREMENT PRIMARY KEY, order_number VARCHAR(50) UNIQUE NOT NULL, customer_id INT, total_amount DECIMAL(10,2) NOT NULL, status VARCHAR(20) DEFAULT \'pending\', shipping_address TEXT, billing_address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    },
    categories: {
      name: 'Categories',
      description: 'Category classification table',
      schema: dbType === 'postgresql'
        ? 'id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, slug VARCHAR(100) UNIQUE, description TEXT, parent_id INTEGER, sort_order INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
        : 'id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, slug VARCHAR(100) UNIQUE, description TEXT, parent_id INT, sort_order INT DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    }
  };
};

// Test database connection
export const testConnection = async () => {
  try {
    if (!connectionPool) {
      return { connected: false, error: 'Database not initialized' };
    }
    
    const result = await executeQuery('SELECT 1 as test');
    return { connected: true, test: result[0], type: dbType };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

// Close database connection
export const closeConnection = async () => {
  if (connectionPool) {
    if (dbType === 'postgresql') {
      await connectionPool.end();
    } else {
      await connectionPool.end();
    }
    connectionPool = null;
    console.log('Database connection pool closed');
  }
};
