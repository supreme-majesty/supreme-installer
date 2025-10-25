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
    
    // Fallback: Set up default database configuration if no config file
    console.log('No database config found, setting up default MySQL configuration');
    dbType = 'mysql';
    dbConfig = {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'mysql',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };
    return true;
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
    console.log('Connection pool status:', connectionPool ? 'initialized' : 'not initialized');
    
    if (!connectionPool) {
      console.log('⚠️ No connection pool, returning mock data');
      return [
        { name: 'test_db', size: '1.2 MB', created: '2024-01-01' },
        { name: 'sample_db', size: '0.5 MB', created: '2024-01-02' }
      ];
    }
    
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
      // Use a simpler approach for MySQL - get databases first, then calculate sizes
      query = `SHOW DATABASES`;
    }
    
    console.log('📝 Executing query:', query.substring(0, 50) + '...');
    databases = await executeQuery(query);
    console.log(`📊 Query returned ${databases.length} results`);
    console.log('Raw database results:', databases);
    
    if (dbType === 'postgresql') {
      return databases.map(db => ({
        name: db.name,
        size: db.size,
        created: db.created ? new Date(db.created).toISOString().split('T')[0] : 'Unknown'
      }));
    } else {
      // Filter out system databases for MySQL and calculate sizes
      const filtered = databases
        .filter(db => !['information_schema', 'mysql', 'performance_schema', 'phpmyadmin', 'test'].includes(db.Database));
      
      console.log(`🔍 Filtered to ${filtered.length} user databases`);
      
      // Calculate sizes for each database
      const databasesWithSizes = await Promise.all(
        filtered.map(async (db) => {
          try {
            const sizeQuery = `
              SELECT 
                ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
              FROM information_schema.tables 
              WHERE table_schema = ?
            `;
            const sizeResult = await executeQuery(sizeQuery, [db.Database]);
            const size = sizeResult[0]?.size_mb || 0;
            
            return {
              name: db.Database,
              size: size > 0 ? `${size} MB` : '0 MB',
              created: 'Unknown' // MySQL doesn't store database creation dates easily
            };
          } catch (error) {
            console.log(`⚠️ Could not calculate size for ${db.Database}:`, error.message);
            return {
              name: db.Database,
              size: 'Unknown',
              created: 'Unknown'
            };
          }
        })
      );
      
      console.log('Databases with sizes:', databasesWithSizes);
      return databasesWithSizes;
    }
  } catch (error) {
    console.error('❌ Error in getDatabases:', error.message);
    console.error('Database type:', dbType);
    console.error('Connection pool status:', connectionPool ? 'initialized' : 'not initialized');
    console.error('Full error:', error);
    
    // Return mock data as fallback
    console.log('🔄 Returning mock data due to error');
    return [
      { name: 'test_db', size: '1.2 MB', created: '2024-01-01' },
      { name: 'sample_db', size: '0.5 MB', created: '2024-01-02' }
    ];
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
          COALESCE(TABLE_ROWS, 0) as \`rows\`,
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
      size: dbType === 'postgresql' ? table.size : (table.size_mb ? `${table.size_mb} MB` : '0 MB')
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
    console.log('createTable called with:', { databaseName, tableName, tableSchema });
    console.log('dbType:', dbType);
    console.log('dbConfig:', dbConfig);
    
    if (!dbType || !dbConfig) {
      throw new Error('Database not properly initialized');
    }
    
    let query;
    if (dbType === 'postgresql') {
      query = `CREATE TABLE "${tableName}" (${tableSchema})`;
    } else {
      query = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${tableSchema})`;
    }
    
    // Create a temporary connection to the specific database
    if (dbType === 'postgresql') {
      const tempPool = new Pool({
        ...dbConfig,
        database: databaseName
      });
      
      await tempPool.query(query);
      await tempPool.end();
    } else {
      // For MySQL, create a temporary connection to the specific database
      const tempPool = mysql.createPool({
        ...dbConfig,
        database: databaseName
      });
      
      await tempPool.execute(query);
      await tempPool.end();
    }
    
    return { success: true, message: `Table '${tableName}' created successfully in database '${databaseName}'` };
  } catch (error) {
    console.error('Error creating table:', error);
    console.error('Table creation details:', {
      databaseName,
      tableName,
      tableSchema,
      errorMessage: error.message,
      errorCode: error.code
    });
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
    
    // Create a temporary connection to the specific database
    if (dbType === 'postgresql') {
      const tempPool = new Pool({
        ...dbConfig,
        database: databaseName
      });
      
      await tempPool.query(query);
      await tempPool.end();
    } else {
      // For MySQL, create a temporary connection to the specific database
      const tempPool = mysql.createPool({
        ...dbConfig,
        database: databaseName
      });
      
      await tempPool.execute(query);
      await tempPool.end();
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

// Update column in a table
export const updateColumn = async (databaseName, tableName, columnData) => {
  try {
    console.log('updateColumn called with:', { databaseName, tableName, columnData });
    console.log('Database config:', { dbType, dbConfig, connectionPool: !!connectionPool });
    
    if (!connectionPool) {
      throw new Error('Database connection not initialized');
    }
    
    const { name, type, nullable, key, default: defaultValue, extra, originalName } = columnData;
    
    // Get the original column data to check if key type changed
    const originalColumn = await getTableStructure(databaseName, tableName);
    const originalColumnData = originalColumn.columns.find(col => col.name === (originalName || name));
    const originalKey = originalColumnData ? originalColumnData.key : '';
    
    // Check if column name has changed
    const nameChanged = originalName && originalName !== name;
    
    // Use the existing connection pool and select database first
    // Use query() instead of execute() for USE statement (not supported in prepared statements)
    await connectionPool.query(`USE \`${databaseName}\``);
    
    // Clean up the type to handle MySQL-specific syntax
    let cleanType = type;
    if (type.includes('mediumtext(')) {
      cleanType = 'MEDIUMTEXT';
    } else if (type.includes('text(')) {
      cleanType = 'TEXT';
    } else if (type.includes('longtext(')) {
      cleanType = 'LONGTEXT';
    }
    
    if (nameChanged) {
      // Use CHANGE COLUMN to rename and modify in one operation
      let columnDef = `\`${name}\` ${cleanType}`;
      
      if (!nullable) {
        columnDef += ' NOT NULL';
      }
      
      if (defaultValue && defaultValue !== 'NULL' && defaultValue !== null) {
        columnDef += ` DEFAULT '${defaultValue}'`;
      }
      
      if (extra) {
        columnDef += ` ${extra}`;
      }
      
      const changeQuery = `ALTER TABLE \`${tableName}\` CHANGE COLUMN \`${originalName}\` ${columnDef}`;
      console.log('Generated CHANGE query:', changeQuery);
      await executeQuery(changeQuery);
    } else {
      // Just modify column properties without renaming
      let columnDef = `\`${name}\` ${cleanType}`;
      
      if (!nullable) {
        columnDef += ' NOT NULL';
      }
      
      if (defaultValue && defaultValue !== 'NULL' && defaultValue !== null) {
        columnDef += ` DEFAULT '${defaultValue}'`;
      }
      
      if (extra) {
        columnDef += ` ${extra}`;
      }
      
      const alterQuery = `ALTER TABLE \`${tableName}\` MODIFY COLUMN ${columnDef}`;
      console.log('Generated ALTER query:', alterQuery);
      await executeQuery(alterQuery);
    }
    
    // Handle UNIQUE constraint changes
    if (originalKey !== key) {
      console.log(`Key type changed from '${originalKey}' to '${key}' for column '${name}'`);
      
      // Remove existing UNIQUE constraint if it exists
      if (originalKey === 'UNI') {
        try {
          // Get the unique index name
          const indexQuery = `SHOW INDEX FROM \`${tableName}\` WHERE Column_name = '${originalName || name}' AND Non_unique = 0`;
          const indexes = await executeQuery(indexQuery);
          
          if (indexes.length > 0) {
            const indexName = indexes[0].Key_name;
            const dropIndexQuery = `ALTER TABLE \`${tableName}\` DROP INDEX \`${indexName}\``;
            console.log('Dropping unique index:', dropIndexQuery);
            await executeQuery(dropIndexQuery);
          }
        } catch (error) {
          console.log('No unique index to drop or error dropping:', error.message);
        }
      }
      
      // Add UNIQUE constraint if requested
      if (key === 'UNI') {
        const addUniqueQuery = `ALTER TABLE \`${tableName}\` ADD UNIQUE (\`${name}\`)`;
        console.log('Adding unique constraint:', addUniqueQuery);
        await executeQuery(addUniqueQuery);
      }
    }
    
    return { 
      success: true, 
      message: `Column '${name}' updated successfully in table '${tableName}'` 
    };
  } catch (error) {
    console.error('Error updating column:', error);
    console.error('Column update details:', {
      databaseName,
      tableName,
      columnData,
      errorMessage: error.message,
      errorCode: error.code
    });
    throw error;
  }
};

// Delete column from a table
export const deleteColumn = async (databaseName, tableName, columnName) => {
  try {
    console.log('deleteColumn called with:', { databaseName, tableName, columnName });
    
    if (!dbType || !dbConfig) {
      throw new Error('Database not properly initialized');
    }
    
    let query;
    if (dbType === 'postgresql') {
      query = `ALTER TABLE "${tableName}" DROP COLUMN "${columnName}"`;
    } else {
      query = `ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``;
    }
    
    console.log('Generated DROP COLUMN query:', query);
    
    // Create a temporary connection to the specific database
    if (dbType === 'postgresql') {
      const tempPool = new Pool({
        ...dbConfig,
        database: databaseName
      });
      
      await tempPool.query(query);
      await tempPool.end();
    } else {
      // For MySQL, create a temporary connection to the specific database
      const tempPool = mysql.createPool({
        ...dbConfig,
        database: databaseName
      });
      
      await tempPool.execute(query);
      await tempPool.end();
    }
    
    return { 
      success: true, 
      message: `Column '${columnName}' deleted successfully from table '${tableName}'` 
    };
  } catch (error) {
    console.error('Error deleting column:', error);
    console.error('Column deletion details:', {
      databaseName,
      tableName,
      columnName,
      errorMessage: error.message,
      errorCode: error.code
    });
    throw error;
  }
};

// Add new column to a table
export const addColumn = async (databaseName, tableName, columnData) => {
  try {
    console.log('addColumn called with:', { databaseName, tableName, columnData });
    
    if (!dbType || !dbConfig) {
      throw new Error('Database not properly initialized');
    }
    
    const { name, type, nullable, key, default: defaultValue, extra } = columnData;
    
    // Build ALTER TABLE ADD COLUMN statement
    let alterQuery;
    if (dbType === 'postgresql') {
      let columnDef = `"${name}" ${type}`;
      
      if (!nullable) {
        columnDef += ' NOT NULL';
      }
      
      if (defaultValue && defaultValue !== 'NULL') {
        columnDef += ` DEFAULT '${defaultValue}'`;
      }
      
      if (extra) {
        columnDef += ` ${extra}`;
      }
      
      alterQuery = `ALTER TABLE "${tableName}" ADD COLUMN ${columnDef}`;
    } else {
      let columnDef = `\`${name}\` ${type}`;
      
      if (!nullable) {
        columnDef += ' NOT NULL';
      }
      
      if (defaultValue && defaultValue !== 'NULL') {
        columnDef += ` DEFAULT '${defaultValue}'`;
      }
      
      if (extra) {
        columnDef += ` ${extra}`;
      }
      
      alterQuery = `ALTER TABLE \`${tableName}\` ADD COLUMN ${columnDef}`;
    }
    
    console.log('Generated ADD COLUMN query:', alterQuery);
    
    // Use existing connection pool and switch to the specific database
    if (dbType === 'postgresql') {
      // For PostgreSQL, we need to create a temporary connection to the specific database
      const tempPool = new Pool({
        ...dbConfig,
        database: databaseName
      });
      
      await tempPool.query(alterQuery);
      await tempPool.end();
    } else {
      // For MySQL, switch to the database and execute the query
      // Use query() instead of execute() for USE statement (not supported in prepared statements)
      await connectionPool.query(`USE \`${databaseName}\``);
      await executeQuery(alterQuery);
      
      // Add UNIQUE constraint if requested
      if (key === 'UNI') {
        const addUniqueQuery = `ALTER TABLE \`${tableName}\` ADD UNIQUE (\`${name}\`)`;
        console.log('Adding unique constraint to new column:', addUniqueQuery);
        await executeQuery(addUniqueQuery);
      }
    }
    
    return { 
      success: true, 
      message: `Column '${name}' added successfully to table '${tableName}'` 
    };
  } catch (error) {
    console.error('Error adding column:', error);
    console.error('Column addition details:', {
      databaseName,
      tableName,
      columnData,
      errorMessage: error.message,
      errorCode: error.code
    });
    throw error;
  }
};

// Search database for specific content
export const searchDatabase = async (databaseName, searchQuery, filters = {}) => {
  try {
    console.log('searchDatabase called with:', { databaseName, searchQuery, filters });
    
    if (!dbType || !dbConfig) {
      throw new Error('Database not properly initialized');
    }
    
    const startTime = Date.now();
    const results = [];
    
    // Use the existing connection pool and select database first
    await connectionPool.query(`USE \`${databaseName}\``);
    
    // Get all tables in the database
    const tables = await getTables(databaseName);
    
    for (const table of tables) {
      try {
        // Get table structure to understand column types
        const structure = await getTableStructure(databaseName, table.name);
        
        // Search in table names if requested
        if (filters.searchIn === 'all' || filters.searchIn === 'tables') {
          if (table.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({
              table: table.name,
              column: 'table_name',
              type: 'table',
              row: 0,
              value: table.name,
              context: 'Table name match'
            });
          }
        }
        
        // Search in data if requested
        if (filters.searchIn === 'all' || filters.searchIn === 'data') {
          // Get sample data from the table (limit to first 100 rows for performance)
          const sampleQuery = `SELECT * FROM \`${table.name}\` LIMIT 100`;
          const sampleData = await executeQuery(sampleQuery);
          
          // Search through each row and column
          for (let rowIndex = 0; rowIndex < sampleData.length; rowIndex++) {
            const row = sampleData[rowIndex];
            
            for (const [columnName, value] of Object.entries(row)) {
              if (value === null || value === undefined) continue;
              
              const stringValue = String(value);
              const searchTerm = filters.caseSensitive ? searchQuery : searchQuery.toLowerCase();
              const searchValue = filters.caseSensitive ? stringValue : stringValue.toLowerCase();
              
              if (searchValue.includes(searchTerm)) {
                // Check data type filter
                const columnInfo = structure.columns.find(col => col.name === columnName);
                const columnType = columnInfo ? columnInfo.type.toLowerCase() : 'unknown';
                
                let matchesFilter = true;
                if (filters.dataType !== 'all') {
                  switch (filters.dataType) {
                    case 'text':
                      matchesFilter = columnType.includes('varchar') || columnType.includes('text') || columnType.includes('char');
                      break;
                    case 'number':
                      matchesFilter = columnType.includes('int') || columnType.includes('decimal') || columnType.includes('float');
                      break;
                    case 'date':
                      matchesFilter = columnType.includes('date') || columnType.includes('time');
                      break;
                  }
                }
                
                if (matchesFilter) {
                  results.push({
                    table: table.name,
                    column: columnName,
                    type: columnType,
                    row: rowIndex + 1,
                    value: stringValue,
                    context: `Found in ${table.name}.${columnName}`
                  });
                }
              }
            }
          }
        }
      } catch (tableError) {
        console.log(`Error searching table ${table.name}:`, tableError.message);
        // Continue with other tables
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      success: true,
      results: results.slice(0, 100), // Limit to 100 results for performance
      totalResults: results.length,
      executionTime,
      message: `Found ${results.length} results in ${executionTime}ms`
    };
  } catch (error) {
    console.error('Error searching database:', error);
    throw error;
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
