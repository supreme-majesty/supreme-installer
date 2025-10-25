#!/usr/bin/env bash
# Supreme Development Environment - Modular Installer
# One-time interactive installer for the 'supreme' CLI and environment.
# Run once per machine (requires sudo).

set -euo pipefail

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source utilities
# shellcheck source=lib/utils.sh
source "$SCRIPT_DIR/supreme/lib/utils.sh"
# shellcheck source=lib/version.sh
source "$SCRIPT_DIR/supreme/lib/version.sh"

# Source modules
# shellcheck source=modules/platform.sh
source "$SCRIPT_DIR/supreme/modules/platform.sh"
# shellcheck source=modules/dependencies.sh
source "$SCRIPT_DIR/supreme/modules/dependencies.sh"
# shellcheck source=modules/virtualhost.sh
source "$SCRIPT_DIR/supreme/modules/virtualhost.sh"

# ----------------------
# Preconditions
# ----------------------
if [[ $EUID -ne 0 ]]; then
  echo "This installer needs sudo. Run: sudo ./supreme-installer.sh"
  exit 1
fi

log "Supreme Development Environment — Modular Installer v$(get_version)"
echo "Build: $BUILD_DATE | Commit: ${GIT_COMMIT:0:8}"
echo

# ----------------------
# Platform Detection
# ----------------------
configure_platform

# ----------------------
# Dependency Check
# ----------------------
log "Checking system dependencies..."
if ! check_and_install_dependencies "$PLATFORM"; then
  err "Dependency check failed. Please install required dependencies and try again."
  show_installation_recommendations "$PLATFORM"
  exit 1
fi

# ----------------------
# Interactive Configuration
# ----------------------
read -rp "Enter project root folder name under webroot (e.g. codes, sites) [default: codes]: " PROJECT_FOLDER
PROJECT_FOLDER=${PROJECT_FOLDER:-codes}

read -rp "Enter domain suffix (TLD) for local sites (e.g. test, local, dev) [default: test]: " TLD
TLD=${TLD:-test}

read -rp "Enter default protocol [http/https] (default: http): " DEFAULT_PROTOCOL
DEFAULT_PROTOCOL=${DEFAULT_PROTOCOL:-http}

read -rp "Enable database management? [Y/n] (default: Y): " ENABLE_DB
ENABLE_DB=${ENABLE_DB:-Y}

# ----------------------
# Virtual Host Mode Selection
# ----------------------
select_virtualhost_mode

# Make choices clear
log "Configuration summary:"
echo "  Platform:        $PLATFORM"
echo "  Webroot folder:  $HTDOCS_ROOT_DEFAULT/$PROJECT_FOLDER"
echo "  Domain suffix:   .$TLD"
echo "  Default protocol:$DEFAULT_PROTOCOL"
echo "  Database mgmt:   $ENABLE_DB"
echo "  Virtual host:    $VIRTUALHOST_MODE mode"
echo "  Vhosts file:     $VHOSTS_PATH"
echo "  Cert folder:     $CERT_ROOT"
echo

if ! confirm "Continue with the above settings?"; then
  echo "Aborted."
  exit 0
fi

# ----------------------
# Directory Setup
# ----------------------
SSL_DIR="$CERT_ROOT"
HTDOCS_DIR="$HTDOCS_ROOT_DEFAULT/$PROJECT_FOLDER"
SUPREME_DIR="/opt/supreme"
SYS_CONF="/etc/supreme"
# Use the new config path function
USER_CONF_FILE=$(get_config_path)

# Database configuration
DB_HOST="localhost"
DB_PORT="3306"
DB_ROOT_USER="root"
DB_ROOT_PASSWORD=""

ensure_dir "$SSL_DIR"
ensure_dir "$HTDOCS_DIR"
ensure_dir "$SYS_CONF"

# ----------------------
# Database Detection
# ----------------------
detect_database

# ----------------------
# SSL Certificate Setup
# ----------------------
if [[ "$DEFAULT_PROTOCOL" == "https" ]]; then
  log "Setting up SSL certificates..."
  # Source SSL module
  # shellcheck source=modules/ssl.sh
  source "$SCRIPT_DIR/supreme/modules/ssl.sh"
  create_wildcard_cert
fi

# ----------------------
# Apache Configuration
# ----------------------
log "Configuring Apache virtual hosts in $VIRTUALHOST_MODE mode..."

case "$VIRTUALHOST_MODE" in
  simple)
    setup_virtualdocumentroot "$TLD" "$HTDOCS_DIR" "$SSL_DIR" "$VHOSTS_PATH"
    ;;
  advanced)
    setup_traditional_vhosts "$TLD" "$HTDOCS_DIR" "$SSL_DIR" "$VHOSTS_PATH"
    ;;
esac

# ----------------------
# Configuration Save
# ----------------------
save_config
ok "Saved config to $USER_CONF_FILE"

# ----------------------
# CLI Installation
# ----------------------
log "Installing 'supreme' CLI to /usr/local/bin/supreme"

# Copy the CLI script
sudo cp "$SCRIPT_DIR/supreme/cli/supreme" /usr/local/bin/supreme
sudo chmod +x /usr/local/bin/supreme

ok "Installed CLI at /usr/local/bin/supreme"

# ----------------------
# Finalization
# ----------------------
# Append Include for sites-enabled into SUPREME_VHOST_INCLUDE so Apache will load them
if ! grep -q "sites-enabled" "$SUPREME_VHOST_INCLUDE"; then
  echo -e "\n# Load enabled supreme sites\nIncludeOptional /etc/supreme/sites-enabled/*.conf\n" | sudo tee -a "$SUPREME_VHOST_INCLUDE" >/dev/null
fi

# Ensure main vhosts file includes supreme include
if ! grep -q "Include $SUPREME_VHOST_INCLUDE" "$VHOSTS_PATH"; then
  echo -e "\n# supreme include\nInclude $SUPREME_VHOST_INCLUDE\n" | sudo tee -a "$VHOSTS_PATH" >/dev/null
fi

# Restart apache to apply changes
log "Restarting Apache to apply changes..."
eval "$APACHE_RESTART_CMD" || true

ok "Supreme setup complete! CLI 'supreme' is available."
echo "Run 'supreme info' to view settings. Create a new site with 'supreme new <name>'."
echo "Use 'supreme enable https' later to enable HTTPS and create wildcard certs (will restart Apache automatically)."
echo
echo "Supreme Development Environment v$(get_version) - Modular Architecture"
echo "Modules: Platform Detection, SSL Management, Database Management, Project Management"
