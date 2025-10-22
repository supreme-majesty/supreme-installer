#!/usr/bin/env bash
# Supreme Development Environment - Platform Detection Module
# Handles platform-specific configurations and paths

# Source utilities
# shellcheck source=lib/utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/../lib/utils.sh"

# ----------------------
# Platform Configuration
# ----------------------
configure_platform() {
  PLATFORM=$(detect_platform)
  
  case "$PLATFORM" in
    macos)
      VHOSTS_PATH_CANDIDATE="/usr/local/etc/httpd/extra/httpd-vhosts.conf"
      APACHE_RESTART_CMD="sudo apachectl restart"
      CERT_ROOT="/usr/local/etc/httpd/ssl"
      HTDOCS_ROOT_DEFAULT="/usr/local/var/www"
      ;;
    windows)
      VHOSTS_PATH_CANDIDATE="/c/xampp/apache/conf/extra/httpd-vhosts.conf"
      APACHE_RESTART_CMD="net stop apache2.4 && net start apache2.4"
      CERT_ROOT="/c/xampp/apache/conf/ssl"
      HTDOCS_ROOT_DEFAULT="/c/xampp/htdocs"
      ;;
    linux)
      HTDOCS_ROOT_DEFAULT="/opt/lampp/htdocs"
      ;;
  esac
  
  detect_apache_config
}

# ----------------------
# Apache Configuration Detection
# ----------------------
detect_apache_config() {
  VHOSTS_PATH=""
  APACHE_RESTART_CMD=""
  CERT_ROOT=""
  
  if [[ "$PLATFORM" == "linux" ]]; then
    # Check for XAMPP first
    if [[ -d "/opt/lampp" ]]; then
      if [[ -f "/opt/lampp/etc/extra/httpd-vhosts.conf" ]]; then
        VHOSTS_PATH="/opt/lampp/etc/extra/httpd-vhosts.conf"
        APACHE_RESTART_CMD="sudo /opt/lampp/lampp restart"
        CERT_ROOT="/opt/lampp/etc/ssl"
        HTDOCS_ROOT_DEFAULT="/opt/lampp/htdocs"
      elif [[ -f "/opt/lampp/apache2/conf/extra/httpd-vhosts.conf" ]]; then
        VHOSTS_PATH="/opt/lampp/apache2/conf/extra/httpd-vhosts.conf"
        APACHE_RESTART_CMD="sudo /opt/lampp/lampp restart"
        CERT_ROOT="/opt/lampp/etc/ssl"
        HTDOCS_ROOT_DEFAULT="/opt/lampp/htdocs"
      fi
    fi
    
    # Fallback to system Apache
    if [[ -z "${VHOSTS_PATH:-}" ]]; then
      if command -v apache2ctl &>/dev/null || systemctl list-units --type=service | grep -q apache2; then
        VHOSTS_PATH="/etc/apache2/sites-available/000-default.conf"
        APACHE_RESTART_CMD="sudo systemctl restart apache2 || sudo service apache2 restart"
        CERT_ROOT="/etc/ssl/supreme"
        HTDOCS_ROOT_DEFAULT="/var/www/html"
      fi
    fi
  else
    # macOS and Windows use predefined paths
    VHOSTS_PATH="$VHOSTS_PATH_CANDIDATE"
    CERT_ROOT="$CERT_ROOT"
  fi
  
  if [[ -z "${VHOSTS_PATH:-}" ]]; then
    err "Could not auto-detect Apache/XAMPP vhosts file. Please ensure Apache/XAMPP is installed."
    exit 1
  fi
  
  ok "Detected platform: $PLATFORM"
  ok "Apache vhosts file: $VHOSTS_PATH"
  ok "Apache restart cmd: $APACHE_RESTART_CMD"
  ok "Default webroot: $HTDOCS_ROOT_DEFAULT"
  ok "Certificate root: $CERT_ROOT"
}

# ----------------------
# Database Detection
# ----------------------
detect_database() {
  if [[ "$ENABLE_DB" != "Y" ]]; then
    return 0
  fi
  
  log "Detecting database configuration..."
  
  case "$PLATFORM" in
    macos)
      if [[ -f "/usr/local/bin/mysql" ]]; then
        DB_HOST="localhost"
        DB_PORT="3306"
        DB_ROOT_USER="root"
        DB_CMD="mysql"
        DB_SERVICE_CMD="brew services"
        ok "Detected Homebrew MySQL"
        return 0
      fi
      ;;
    windows)
      if [[ -f "/c/xampp/mysql/bin/mysql.exe" ]]; then
        DB_HOST="localhost"
        DB_PORT="3306"
        DB_ROOT_USER="root"
        DB_ROOT_PASSWORD=""
        DB_CMD="/c/xampp/mysql/bin/mysql.exe"
        DB_SERVICE_CMD="net"
        ok "Detected XAMPP MySQL on Windows"
        return 0
      fi
      ;;
    linux)
      # Check for XAMPP MySQL
      if [[ -d "/opt/lampp" ]] && [[ -f "/opt/lampp/bin/mysql" ]]; then
        DB_HOST="localhost"
        DB_PORT="3306"
        DB_ROOT_USER="root"
        DB_ROOT_PASSWORD=""
        DB_CMD="/opt/lampp/bin/mysql"
        DB_SERVICE_CMD="sudo /opt/lampp/lampp"
        ok "Detected XAMPP MySQL"
        return 0
      fi
      
      # Check for system MySQL/MariaDB
      if command -v mysql &>/dev/null; then
        DB_HOST="localhost"
        DB_PORT="3306"
        DB_ROOT_USER="root"
        DB_CMD="mysql"
        
        # Try to detect if password is required
        if mysql -u root -e "SELECT 1;" &>/dev/null; then
          DB_ROOT_PASSWORD=""
        else
          log "MySQL root password required. You'll need to enter it when using database commands."
          DB_ROOT_PASSWORD="REQUIRED"
        fi
        
        if command -v systemctl &>/dev/null; then
          DB_SERVICE_CMD="sudo systemctl"
        else
          DB_SERVICE_CMD="sudo service"
        fi
        ok "Detected system MySQL/MariaDB"
        return 0
      fi
      ;;
  esac
  
  err "No MySQL/MariaDB installation detected. Database management will be disabled."
  ENABLE_DB="N"
}
