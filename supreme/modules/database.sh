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
  
  if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
    $DB_CMD -u "$DB_ROOT_USER" -p -e "CREATE DATABASE IF NOT EXISTS \`$db_name\`;"
  else
    $DB_CMD -u "$DB_ROOT_USER" -e "CREATE DATABASE IF NOT EXISTS \`$db_name\`;"
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
  
  if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
    $DB_CMD -u "$DB_ROOT_USER" -p -e "DROP DATABASE IF EXISTS \`$db_name\`;"
  else
    $DB_CMD -u "$DB_ROOT_USER" -e "DROP DATABASE IF EXISTS \`$db_name\`;"
  fi
  
  ok "Database '$db_name' dropped successfully"
}

db_list() {
  log "Available databases:"
  
  if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
    $DB_CMD -u "$DB_ROOT_USER" -p -e "SHOW DATABASES;" | grep -v -E "^(Database|information_schema|performance_schema|mysql|sys)$"
  else
    $DB_CMD -u "$DB_ROOT_USER" -e "SHOW DATABASES;" | grep -v -E "^(Database|information_schema|performance_schema|mysql|sys)$"
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
