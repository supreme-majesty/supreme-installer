#!/usr/bin/env bash
# Supreme Development Environment - Shared Utilities
# Common functions used across all modules

# ----------------------
# Logging Functions
# ----------------------
log() { printf "\n\x1b[1;34m%s\x1b[0m\n" "$1"; }
ok()  { printf "\x1b[1;32m%s\x1b[0m\n" "$1"; }
err() { printf "\x1b[1;31m%s\x1b[0m\n" "$1"; }
warn() { printf "\x1b[1;33m%s\x1b[0m\n" "$1"; }

# ----------------------
# User Interaction
# ----------------------
confirm() {
  read -rp "$1 [Y/n]: " _r
  _r=${_r:-Y}
  case "$_r" in [Yy]* ) return 0;; * ) return 1;; esac
}

# ----------------------
# System Detection
# ----------------------
detect_platform() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    echo "macos"
  elif [[ "$(uname -s)" == *"MINGW"* ]] || [[ "$(uname -s)" == *"CYGWIN"* ]] || [[ "$OSTYPE" == "msys" ]]; then
    echo "windows"
  else
    echo "linux"
  fi
}

# ----------------------
# File Operations
# ----------------------
ensure_dir() {
  local dir="$1"
  local owner="${2:-$(logname)}"
  sudo mkdir -p "$dir"
  sudo chown -R "$owner":"$owner" "$dir"
}

# ----------------------
# Process Management
# ----------------------
is_running() {
  local process="$1"
  pgrep -f "$process" >/dev/null 2>&1
}

# ----------------------
# Network Operations
# ----------------------
check_port() {
  local port="$1"
  netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "
}

# ----------------------
# Validation
# ----------------------
validate_project_name() {
  local name="$1"
  if [[ ! "$name" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    err "Project name must contain only letters, numbers, hyphens, and underscores"
    return 1
  fi
  return 0
}

# ----------------------
# Configuration Management
# ----------------------
load_config() {
  local config_file="$HOME/.supreme/config.env"
  if [[ -f "$config_file" ]]; then
    # shellcheck disable=SC1090
    source "$config_file"
    return 0
  else
    err "Supreme not configured. Run the installer first."
    return 1
  fi
}

save_config() {
  local config_file="$HOME/.supreme/config.env"
  local config_dir="$(dirname "$config_file")"
  
  mkdir -p "$config_dir"
  
  cat > "$config_file" <<EOF
PLATFORM=$PLATFORM
VHOSTS_PATH=$VHOSTS_PATH
APACHE_RESTART_CMD=$APACHE_RESTART_CMD
CERT_DIR=$SSL_DIR
HTDOCS_ROOT=$HTDOCS_DIR
SYS_CONF_DIR=$SYS_CONF
TLD=$TLD
PROJECT_FOLDER=$PROJECT_FOLDER
DEFAULT_PROTOCOL=$DEFAULT_PROTOCOL
ENABLE_DB=$ENABLE_DB
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_ROOT_USER=$DB_ROOT_USER
DB_ROOT_PASSWORD=$DB_ROOT_PASSWORD
DB_CMD=$DB_CMD
DB_SERVICE_CMD=$DB_SERVICE_CMD
EOF
}

# ----------------------
# Error Handling
# ----------------------
handle_error() {
  local exit_code="$1"
  local message="${2:-An error occurred}"
  
  if [[ $exit_code -ne 0 ]]; then
    err "$message"
    exit $exit_code
  fi
}

# ----------------------
# Version Management
# ----------------------
get_version() {
  echo "2.0.0"
}

# ----------------------
# Cleanup Functions
# ----------------------
cleanup_temp_files() {
  local temp_dir="/tmp/supreme-$$"
  if [[ -d "$temp_dir" ]]; then
    rm -rf "$temp_dir"
  fi
}

# Set up cleanup on exit
trap cleanup_temp_files EXIT
