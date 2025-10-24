#!/usr/bin/env bash
# Supreme Configuration Extractor
# Outputs platform configuration in parseable format

# Get absolute path to script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the platform module
source "$SCRIPT_DIR/modules/platform.sh"

# Run platform detection
configure_platform

# Try to load existing configuration to get project folder
PROJECT_FOLDER="codes"  # default
if [[ -f "$HOME/.supreme/config.env" ]]; then
  source "$HOME/.supreme/config.env"
  PROJECT_FOLDER=${PROJECT_FOLDER:-codes}
fi

# Calculate the actual webroot directory (base + project folder)
ACTUAL_WEBROOT="$HTDOCS_ROOT_DEFAULT/$PROJECT_FOLDER"

# Output configuration in key=value format (only the key=value lines, no other output)
echo "HTDOCS_ROOT_DEFAULT=$HTDOCS_ROOT_DEFAULT" >&2
echo "PROJECT_FOLDER=$PROJECT_FOLDER" >&2
echo "ACTUAL_WEBROOT=$ACTUAL_WEBROOT" >&2
echo "VHOSTS_PATH=$VHOSTS_PATH" >&2
echo "APACHE_RESTART_CMD=$APACHE_RESTART_CMD" >&2
echo "CERT_ROOT=$CERT_ROOT" >&2
echo "PLATFORM=$PLATFORM" >&2

# Output to stdout for parsing
echo "HTDOCS_ROOT_DEFAULT=$HTDOCS_ROOT_DEFAULT"
echo "PROJECT_FOLDER=$PROJECT_FOLDER"
echo "ACTUAL_WEBROOT=$ACTUAL_WEBROOT"
echo "VHOSTS_PATH=$VHOSTS_PATH"
echo "APACHE_RESTART_CMD=$APACHE_RESTART_CMD"
echo "CERT_ROOT=$CERT_ROOT"
echo "PLATFORM=$PLATFORM"
