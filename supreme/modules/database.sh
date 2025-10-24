#!/usr/bin/env bash
# Supreme Development Environment - Database Management Module
# Handles database operations and management

# Source utilities
# shellcheck source=lib/utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/../lib/utils.sh"

# ----------------------
# Database Operations
# ----------------------
db_create() {
  local db_name="$1"
  
  if [[ -z "$db_name" ]]; then
    err "Database name is required"
    return 1
  fi
  
  log "Creating database: $db_name"
  
  if [[ "$DB_TYPE" == "postgresql" ]]; then
    if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
      PGPASSWORD="$DB_ROOT_PASSWORD" $DB_CMD -U "$DB_ROOT_USER" -c "CREATE DATABASE \"$db_name\";"
    else
      $DB_CMD -U "$DB_ROOT_USER" -c "CREATE DATABASE \"$db_name\";"
    fi
  else
    if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
      $DB_CMD -u "$DB_ROOT_USER" -p -e "CREATE DATABASE IF NOT EXISTS \`$db_name\`;"
    else
      $DB_CMD -u "$DB_ROOT_USER" -e "CREATE DATABASE IF NOT EXISTS \`$db_name\`;"
    fi
  fi
  
  ok "Database '$db_name' created successfully"
}

db_drop() {
  local db_name="$1"
  
  if [[ -z "$db_name" ]]; then
    err "Database name is required"
    return 1
  fi
  
  if ! confirm "Are you sure you want to drop database '$db_name'?"; then
    warn "Aborted."
    return 0
  fi
  
  log "Dropping database: $db_name"
  
  if [[ "$DB_TYPE" == "postgresql" ]]; then
    if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
      PGPASSWORD="$DB_ROOT_PASSWORD" $DB_CMD -U "$DB_ROOT_USER" -c "DROP DATABASE IF EXISTS \"$db_name\";"
    else
      $DB_CMD -U "$DB_ROOT_USER" -c "DROP DATABASE IF EXISTS \"$db_name\";"
    fi
  else
    if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
      $DB_CMD -u "$DB_ROOT_USER" -p -e "DROP DATABASE IF EXISTS \`$db_name\`;"
    else
      $DB_CMD -u "$DB_ROOT_USER" -e "DROP DATABASE IF EXISTS \`$db_name\`;"
    fi
  fi
  
  ok "Database '$db_name' dropped successfully"
}

db_list() {
  log "Available databases:"
  
  if [[ "$DB_TYPE" == "postgresql" ]]; then
    if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
      PGPASSWORD="$DB_ROOT_PASSWORD" $DB_CMD -U "$DB_ROOT_USER" -c "\l" | grep -v -E "^(List|template|postgres)$" | awk 'NR>2 {print $1}' | grep -v '^$'
    else
      $DB_CMD -U "$DB_ROOT_USER" -c "\l" | grep -v -E "^(List|template|postgres)$" | awk 'NR>2 {print $1}' | grep -v '^$'
    fi
  else
    if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
      $DB_CMD -u "$DB_ROOT_USER" -p -e "SHOW DATABASES;" | grep -v -E "^(Database|information_schema|performance_schema|mysql|phpmyadmin|test)$"
    else
      $DB_CMD -u "$DB_ROOT_USER" -e "SHOW DATABASES;" | grep -v -E "^(Database|information_schema|performance_schema|mysql|phpmyadmin|test)$"
    fi
  fi
}

db_import() {
  local db_name="$1"
  local sql_file="$2"
  
  if [[ -z "$db_name" ]] || [[ -z "$sql_file" ]]; then
    err "Usage: supreme db import <database_name> <sql_file>"
    return 1
  fi
  
  if [[ ! -f "$sql_file" ]]; then
    err "SQL file not found: $sql_file"
    return 1
  fi
  
  log "Importing $sql_file into database: $db_name"
  
  if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
    $DB_CMD -u "$DB_ROOT_USER" -p "$db_name" < "$sql_file"
  else
    $DB_CMD -u "$DB_ROOT_USER" "$db_name" < "$sql_file"
  fi
  
  ok "Import completed successfully"
}

db_export() {
  local db_name="$1"
  
  if [[ -z "$db_name" ]]; then
    err "Usage: supreme db export <database_name>"
    return 1
  fi
  
  local output_file="${db_name}_$(date +%Y%m%d_%H%M%S).sql"
  log "Exporting database '$db_name' to: $output_file"
  
  if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
    $DB_CMD -u "$DB_ROOT_USER" -p --single-transaction --routines --triggers "$db_name" > "$output_file"
  else
    $DB_CMD -u "$DB_ROOT_USER" --single-transaction --routines --triggers "$db_name" > "$output_file"
  fi
  
  ok "Export completed: $output_file"
}

db_status() {
  log "Database service status:"
  
  case "$DB_SERVICE_CMD" in
    *systemctl*)
      systemctl status mysql || systemctl status mariadb || systemctl status postgresql || echo "Database service not found"
      ;;
    *service*)
      service mysql status || service mariadb status || service postgresql status || echo "Database service not found"
      ;;
    *rc-service*)
      rc-service status mysql || rc-service status mariadb || rc-service status postgresql || echo "Database service not found"
      ;;
    *lampp*)
      echo "XAMPP MySQL status:"
      $DB_SERVICE_CMD status
      ;;
    *brew*)
      brew services list | grep -E "(mysql|postgresql)" || echo "Database service not found"
      ;;
    *net*)
      echo "Windows database service status:"
      net start | grep -iE "(mysql|postgresql)" || echo "Database service not found"
      ;;
    *launchd*)
      launchctl list | grep -iE "(mysql|postgresql)" || echo "Database service not found"
      ;;
  esac
}

# ----------------------
# Table Operations
# ----------------------
db_create_table() {
  local db_name="$1"
  local table_name="$2"
  local table_schema="$3"
  
  if [[ -z "$db_name" ]] || [[ -z "$table_name" ]] || [[ -z "$table_schema" ]]; then
    err "Usage: supreme db create-table <database_name> <table_name> <table_schema>"
    return 1
  fi
  
  log "Creating table '$table_name' in database '$db_name'"
  
  if [[ "$DB_TYPE" == "postgresql" ]]; then
    if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
      PGPASSWORD="$DB_ROOT_PASSWORD" $DB_CMD -U "$DB_ROOT_USER" -d "$db_name" -c "CREATE TABLE \"$table_name\" ($table_schema);"
    else
      $DB_CMD -U "$DB_ROOT_USER" -d "$db_name" -c "CREATE TABLE \"$table_name\" ($table_schema);"
    fi
  else
    if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
      $DB_CMD -u "$DB_ROOT_USER" -p -D "$db_name" -e "CREATE TABLE IF NOT EXISTS \`$table_name\` ($table_schema);"
    else
      $DB_CMD -u "$DB_ROOT_USER" -D "$db_name" -e "CREATE TABLE IF NOT EXISTS \`$table_name\` ($table_schema);"
    fi
  fi
  
  ok "Table '$table_name' created successfully in database '$db_name'"
}

db_drop_table() {
  local db_name="$1"
  local table_name="$2"
  
  if [[ -z "$db_name" ]] || [[ -z "$table_name" ]]; then
    err "Usage: supreme db drop-table <database_name> <table_name>"
    return 1
  fi
  
  if ! confirm "Are you sure you want to drop table '$table_name' from database '$db_name'?"; then
    warn "Aborted."
    return 0
  fi
  
  log "Dropping table '$table_name' from database '$db_name'"
  
  if [[ "$DB_TYPE" == "postgresql" ]]; then
    if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
      PGPASSWORD="$DB_ROOT_PASSWORD" $DB_CMD -U "$DB_ROOT_USER" -d "$db_name" -c "DROP TABLE IF EXISTS \"$table_name\";"
    else
      $DB_CMD -U "$DB_ROOT_USER" -d "$db_name" -c "DROP TABLE IF EXISTS \"$table_name\";"
    fi
  else
    if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
      $DB_CMD -u "$DB_ROOT_USER" -p -D "$db_name" -e "DROP TABLE IF EXISTS \`$table_name\`;"
    else
      $DB_CMD -u "$DB_ROOT_USER" -D "$db_name" -e "DROP TABLE IF EXISTS \`$table_name\`;"
    fi
  fi
  
  ok "Table '$table_name' dropped successfully from database '$db_name'"
}

db_list_tables() {
  local db_name="$1"
  
  if [[ -z "$db_name" ]]; then
    err "Database name is required"
    return 1
  fi
  
  log "Tables in database '$db_name':"
  
  if [[ "$DB_TYPE" == "postgresql" ]]; then
    if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
      PGPASSWORD="$DB_ROOT_PASSWORD" $DB_CMD -U "$DB_ROOT_USER" -d "$db_name" -c "\dt" | grep -v "List of relations" | awk 'NR>2 {print $1}' | grep -v '^$'
    else
      $DB_CMD -U "$DB_ROOT_USER" -d "$db_name" -c "\dt" | grep -v "List of relations" | awk 'NR>2 {print $1}' | grep -v '^$'
    fi
  else
    if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
      $DB_CMD -u "$DB_ROOT_USER" -p -D "$db_name" -e "SHOW TABLES;" | grep -v "Tables_in_"
    else
      $DB_CMD -u "$DB_ROOT_USER" -D "$db_name" -e "SHOW TABLES;" | grep -v "Tables_in_"
    fi
  fi
}

db_describe_table() {
  local db_name="$1"
  local table_name="$2"
  
  if [[ -z "$db_name" ]] || [[ -z "$table_name" ]]; then
    err "Usage: supreme db describe-table <database_name> <table_name>"
    return 1
  fi
  
  log "Table structure for '$table_name' in database '$db_name':"
  
  if [[ "$DB_TYPE" == "postgresql" ]]; then
    if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
      PGPASSWORD="$DB_ROOT_PASSWORD" $DB_CMD -U "$DB_ROOT_USER" -d "$db_name" -c "\d \"$table_name\""
    else
      $DB_CMD -U "$DB_ROOT_USER" -d "$db_name" -c "\d \"$table_name\""
    fi
  else
    if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
      $DB_CMD -u "$DB_ROOT_USER" -p -D "$db_name" -e "DESCRIBE \`$table_name\`;"
    else
      $DB_CMD -u "$DB_ROOT_USER" -D "$db_name" -e "DESCRIBE \`$table_name\`;"
    fi
  fi
}

# ----------------------
# Table Schema Templates
# ----------------------
db_get_table_templates() {
  echo "Available table templates:"
  echo "1. users - Basic user table with authentication fields"
  echo "2. posts - Blog posts table with content and metadata"
  echo "3. products - E-commerce products table"
  echo "4. orders - Order management table"
  echo "5. categories - Category classification table"
  echo "6. custom - Create custom table schema"
}

db_get_template_schema() {
  local template="$1"
  
  case "$template" in
    "users")
      if [[ "$DB_TYPE" == "postgresql" ]]; then
        echo "id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, email VARCHAR(100) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, first_name VARCHAR(50), last_name VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      else
        echo "id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, email VARCHAR(100) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, first_name VARCHAR(50), last_name VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      fi
      ;;
    "posts")
      if [[ "$DB_TYPE" == "postgresql" ]]; then
        echo "id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, content TEXT, slug VARCHAR(255) UNIQUE, author_id INTEGER, status VARCHAR(20) DEFAULT 'draft', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      else
        echo "id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255) NOT NULL, content TEXT, slug VARCHAR(255) UNIQUE, author_id INT, status VARCHAR(20) DEFAULT 'draft', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      fi
      ;;
    "products")
      if [[ "$DB_TYPE" == "postgresql" ]]; then
        echo "id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, price DECIMAL(10,2) NOT NULL, sku VARCHAR(100) UNIQUE, category_id INTEGER, stock_quantity INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      else
        echo "id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, price DECIMAL(10,2) NOT NULL, sku VARCHAR(100) UNIQUE, category_id INT, stock_quantity INT DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      fi
      ;;
    "orders")
      if [[ "$DB_TYPE" == "postgresql" ]]; then
        echo "id SERIAL PRIMARY KEY, order_number VARCHAR(50) UNIQUE NOT NULL, customer_id INTEGER, total_amount DECIMAL(10,2) NOT NULL, status VARCHAR(20) DEFAULT 'pending', shipping_address TEXT, billing_address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      else
        echo "id INT AUTO_INCREMENT PRIMARY KEY, order_number VARCHAR(50) UNIQUE NOT NULL, customer_id INT, total_amount DECIMAL(10,2) NOT NULL, status VARCHAR(20) DEFAULT 'pending', shipping_address TEXT, billing_address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      fi
      ;;
    "categories")
      if [[ "$DB_TYPE" == "postgresql" ]]; then
        echo "id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, slug VARCHAR(100) UNIQUE, description TEXT, parent_id INTEGER, sort_order INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      else
        echo "id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, slug VARCHAR(100) UNIQUE, description TEXT, parent_id INT, sort_order INT DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      fi
      ;;
    *)
      err "Unknown template: $template"
      return 1
      ;;
  esac
}

# ----------------------
# Database Health Check
# ----------------------
check_database_health() {
  if [[ "$ENABLE_DB" != "Y" ]]; then
    echo "Database management: Disabled"
    return 0
  fi
  
  echo "Database management: $ENABLE_DB"
  echo "DB command: $DB_CMD"
  echo "DB service: $DB_SERVICE_CMD"
  
  if command -v "$DB_CMD" &>/dev/null; then
    echo "Database client: ✓ Available"
  else
    echo "Database client: ✗ Not found"
  fi
}
