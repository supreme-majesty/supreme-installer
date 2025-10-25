#!/usr/bin/env bash
# Supreme Development Environment - Virtual Host Management Module
# Handles both traditional vhost files and VirtualDocumentRoot dynamic hosting

# Source utilities
# shellcheck source=lib/utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/../lib/utils.sh"

# ----------------------
# Virtual Host Modes
# ----------------------
VIRTUALHOST_MODE="advanced"  # Default to advanced mode

# ----------------------
# Load Configuration
# ----------------------
load_virtualhost_config() {
  # Load config if not already loaded
  if [[ -z "${HTDOCS_ROOT:-}" ]]; then
    load_config
  fi
}

# ----------------------
# VirtualDocumentRoot Setup (Simple Mode)
# ----------------------
setup_virtualdocumentroot() {
  local tld="$1"
  local htdocs_dir="$2"
  local ssl_dir="$3"
  local vhosts_path="$4"
  
  log "Setting up VirtualDocumentRoot mode for automatic folder-to-domain mapping"
  
  # Create the dynamic virtual host config
  local supreme_conf="/etc/supreme/httpd-supreme.conf"
  
  cat > /tmp/httpd-supreme.conf <<EOF
# =================================================================
# Supreme Auto VirtualHost Config — DO NOT EDIT MANUALLY
# Automatically serves all folders inside $htdocs_dir
# URL: https://{folder}.$tld
# =================================================================

<IfModule ssl_module>
  <VirtualHost *:443>
    ServerName dummy.$tld
    SSLEngine on
    SSLCertificateFile "$ssl_dir/_wildcard.$tld.pem"
    SSLCertificateKeyFile "$ssl_dir/_wildcard.$tld-key.pem"

    VirtualDocumentRoot "$htdocs_dir/%1"
    UseCanonicalName Off
    VirtualDocumentRootIP Off

    <Directory "$htdocs_dir">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
  </VirtualHost>
</VirtualHost>

<VirtualHost *:80>
    ServerName dummy.$tld
    VirtualDocumentRoot "$htdocs_dir/%1"
    UseCanonicalName Off
    VirtualDocumentRootIP Off

    <Directory "$htdocs_dir">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
EOF

  sudo mv /tmp/httpd-supreme.conf "$supreme_conf"
  
  # Include the config in main Apache config if not already included
  if ! grep -q "httpd-supreme.conf" "$vhosts_path" 2>/dev/null; then
    log "Linking Supreme dynamic config into Apache configuration"
    echo "Include /etc/supreme/httpd-supreme.conf" | sudo tee -a "$vhosts_path" >/dev/null
  fi
  
  ok "VirtualDocumentRoot mode configured"
  ok "Any folder created in $htdocs_dir will automatically be served as https://<foldername>.$tld"
}

# ----------------------
# Traditional Virtual Host Setup (Advanced Mode)
# ----------------------
setup_traditional_vhosts() {
  local tld="$1"
  local htdocs_dir="$2"
  local ssl_dir="$3"
  local vhosts_path="$4"
  
  log "Setting up traditional virtual host mode with individual vhost files"
  
  # Create sites directories
  ensure_dir "/etc/supreme/sites-available"
  ensure_dir "/etc/supreme/sites-enabled"
  
  # Create the main include file
  local supreme_include="/etc/supreme/supreme-vhosts.conf"
  
  cat > /tmp/supreme-vhosts.tmp <<EOF
# Supreme auto vhosts include (managed by supreme command)
# DO NOT EDIT MANUALLY — use 'supreme' CLI.
# This file is safe to include in Apache configuration.
# It will load per-site vhosts stored in /etc/supreme/sites-enabled/
EOF

  sudo mv /tmp/supreme-vhosts.tmp "$supreme_include"
  
  # Include sites-enabled
  echo -e "\n# Load enabled supreme sites\nIncludeOptional /etc/supreme/sites-enabled/*.conf\n" | sudo tee -a "$supreme_include" >/dev/null
  
  # Include the main config in Apache
  if ! grep -q "supreme-vhosts.conf" "$vhosts_path" 2>/dev/null; then
    log "Linking Supreme include into Apache vhosts file ($vhosts_path)"
    echo -e "\n# Supreme include (added by supreme-setup)\nInclude $supreme_include\n" | sudo tee -a "$vhosts_path" >/dev/null
  fi
  
  ok "Traditional virtual host mode configured"
  ok "Use 'supreme new <project>' to create individual project vhosts"
}

# ----------------------
# Mode Selection
# ----------------------
select_virtualhost_mode() {
  load_virtualhost_config
  log "Virtual Host Configuration Mode"
  echo "Choose your preferred virtual host management:"
  echo "1. Simple Mode (VirtualDocumentRoot) - Just create folders, automatic domains"
  echo "2. Advanced Mode (Individual vhosts) - Full control, per-project configuration"
  echo
  
  read -rp "Select mode [1-2] (default: 1): " mode_choice
  mode_choice=${mode_choice:-1}
  
  case "$mode_choice" in
    1)
      VIRTUALHOST_MODE="simple"
      log "Selected: Simple Mode (VirtualDocumentRoot)"
      echo "  ✓ Automatic folder-to-domain mapping"
      echo "  ✓ No manual vhost creation needed"
      echo "  ✓ Perfect for rapid prototyping"
      ;;
    2)
      VIRTUALHOST_MODE="advanced"
      log "Selected: Advanced Mode (Individual vhosts)"
      echo "  ✓ Full control over each project"
      echo "  ✓ Custom vhost configurations"
      echo "  ✓ Framework-specific optimizations"
      ;;
    *)
      err "Invalid selection. Using default: Simple Mode"
      VIRTUALHOST_MODE="simple"
      ;;
  esac
  
  # Save mode to config
  local config_file=$(get_config_path)
  echo "VIRTUALHOST_MODE=$VIRTUALHOST_MODE" >> "$config_file"
}

# ----------------------
# Project Creation (Simple Mode)
# ----------------------
create_simple_project() {
  load_virtualhost_config
  local name="$1"
  local project_dir="$HTDOCS_ROOT/$name"
  
  if [[ -d "$project_dir" ]]; then
    warn "Project folder already exists: $project_dir"
    return 0
  fi
  
  log "Creating simple project: $name"
  
  # Just create the directory
  sudo mkdir -p "$project_dir"
  sudo chown -R "$(logname)":"$(logname)" "$project_dir"
  
  # Create a basic index.html
  cat > "$project_dir/index.html" <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>$name</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #333; }
        .info { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 $name</h1>
        <div class="info">
            <h3>Supreme Development Environment</h3>
            <p><strong>URL:</strong> <a href="http$([ "$DEFAULT_PROTOCOL" == "https" ] && echo 's')://$name.$TLD">http$([ "$DEFAULT_PROTOCOL" == "https" ] && echo 's')://$name.$TLD</a></p>
            <p><strong>Project Path:</strong> $project_dir</p>
            <p><strong>Mode:</strong> Simple (VirtualDocumentRoot)</p>
        </div>
        <p>Your project is ready! Just add your files to this directory.</p>
    </div>
</body>
</html>
EOF
  
  # Add hosts entry
  if ! grep -q "$name.$TLD" /etc/hosts; then
    echo "127.0.0.1    $name.$TLD" | sudo tee -a /etc/hosts >/dev/null
    ok "Added /etc/hosts entry for $name.$TLD"
  fi
  
  ok "Simple project created: $name"
  ok "Access your project at: http$([ "$DEFAULT_PROTOCOL" == "https" ] && echo 's')://$name.$TLD"
}

# ----------------------
# Project Creation (Advanced Mode)
# ----------------------
create_advanced_project() {
  load_virtualhost_config
  local name="$1"
  local project_dir="$HTDOCS_ROOT/$name"
  local vfile="$site_available_dir/$name.conf"
  
  if [[ -d "$project_dir" ]]; then
    warn "Project folder already exists: $project_dir"
    return 0
  fi
  
  log "Creating advanced project: $name"
  
  # Create project directory
  sudo mkdir -p "$project_dir"
  sudo chown -R "$(logname)":"$(logname)" "$project_dir"
  
  # Create vhost file
  if [[ "$DEFAULT_PROTOCOL" == "https" ]]; then
    cat > "$vfile" <<VHOST
<VirtualHost *:443>
    ServerName $name.$TLD
    DocumentRoot "$project_dir"
    SSLEngine on
    SSLCertificateFile "$CERT_DIR/_wildcard.$TLD.pem"
    SSLCertificateKeyFile "$CERT_DIR/_wildcard.$TLD-key.pem"
    <Directory "$project_dir">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
VHOST
  else
    cat > "$vfile" <<VHOST
<VirtualHost *:80>
    ServerName $name.$TLD
    DocumentRoot "$project_dir"
    <Directory "$project_dir">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
VHOST
  fi
  
  sudo mv "$vfile" "$site_available_dir/"
  sudo ln -sf "$site_available_dir/$(basename "$vfile")" "$site_enabled_dir/$(basename "$vfile")"
  
  # Add hosts entry
  if ! grep -q "$name.$TLD" /etc/hosts; then
    echo "127.0.0.1    $name.$TLD" | sudo tee -a /etc/hosts >/dev/null
    ok "Added /etc/hosts entry for $name.$TLD"
  fi
  
  # Create basic index.html
  cat > "$project_dir/index.html" <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>$name</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #333; }
        .info { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 $name</h1>
        <div class="info">
            <h3>Supreme Development Environment</h3>
            <p><strong>URL:</strong> <a href="http$([ "$DEFAULT_PROTOCOL" == "https" ] && echo 's')://$name.$TLD">http$([ "$DEFAULT_PROTOCOL" == "https" ] && echo 's')://$name.$TLD</a></p>
            <p><strong>Project Path:</strong> $project_dir</p>
            <p><strong>Mode:</strong> Advanced (Individual vhost)</p>
            <p><strong>Vhost File:</strong> $vfile</p>
        </div>
        <p>Your project is ready! Just add your files to this directory.</p>
    </div>
</body>
</html>
EOF
  
  ok "Advanced project created: $name"
  ok "Access your project at: http$([ "$DEFAULT_PROTOCOL" == "https" ] && echo 's')://$name.$TLD"
}

# ----------------------
# Mode Switching
# ----------------------
switch_virtualhost_mode() {
  load_virtualhost_config
  local new_mode="$1"
  
  if [[ "$new_mode" == "$VIRTUALHOST_MODE" ]]; then
    warn "Already in $new_mode mode"
    return 0
  fi
  
  log "Switching from $VIRTUALHOST_MODE to $new_mode mode"
  
  # Update config
  local config_file=$(get_config_path)
  sed -i "s/^VIRTUALHOST_MODE=.*/VIRTUALHOST_MODE=$new_mode/" "$config_file"
  VIRTUALHOST_MODE="$new_mode"
  
  # Reconfigure Apache
  case "$new_mode" in
    simple)
      setup_virtualdocumentroot "$TLD" "$HTDOCS_DIR" "$SSL_DIR" "$VHOSTS_PATH"
      ;;
    advanced)
      setup_traditional_vhosts "$TLD" "$HTDOCS_DIR" "$SSL_DIR" "$VHOSTS_PATH"
      ;;
  esac
  
  # Restart Apache
  eval "$APACHE_RESTART_CMD"
  
  ok "Switched to $new_mode mode"
}

# ----------------------
# Project Status (Both Modes)
# ----------------------
get_project_status() {
  load_virtualhost_config
  local name="$1"
  local project_dir="$HTDOCS_ROOT/$name"
  
  echo "Project Status: $name"
  echo "=================="
  echo "Mode: $VIRTUALHOST_MODE"
  
  if [[ -d "$project_dir" ]]; then
    echo "Project folder: ✓ Present ($project_dir)"
    echo "Folder size: $(du -sh "$project_dir" | cut -f1)"
  else
    echo "Project folder: ✗ Not found"
  fi
  
  if [[ "$VIRTUALHOST_MODE" == "simple" ]]; then
    echo "Virtual host: ✓ Automatic (VirtualDocumentRoot)"
    echo "URL: http$([ "$DEFAULT_PROTOCOL" == "https" ] && echo 's')://$name.$TLD"
  else
    local vfile_available="$site_available_dir/$name.conf"
    local vfile_enabled="$site_enabled_dir/$name.conf"
    
    if [[ -f "$vfile_available" ]]; then
      echo "Vhost config: ✓ Available ($vfile_available)"
    else
      echo "Vhost config: ✗ Not found"
    fi
    
    if [[ -L "$vfile_enabled" ]]; then
      echo "Vhost status: ✓ Enabled"
      echo "URL: http$([ "$DEFAULT_PROTOCOL" == "https" ] && echo 's')://$name.$TLD"
    else
      echo "Vhost status: ✗ Disabled"
    fi
  fi
  
  if grep -q "$name.$TLD" /etc/hosts; then
    echo "Hosts entry: ✓ Present"
  else
    echo "Hosts entry: ✗ Missing"
  fi
}

# ----------------------
# Quick Project Creation (Custom Domain)
# ----------------------
create_quick_project() {
  load_virtualhost_config
  local domain="$1"
  local folder="$2"
  local project_dir="$HTDOCS_ROOT/$folder"
  
  log "Creating quick project with custom domain: $domain"
  
  # Create project directory if it doesn't exist
  if [[ ! -d "$project_dir" ]]; then
    if confirm "Project folder not found at $project_dir. Do you want to create it?"; then
      sudo mkdir -p "$project_dir"
      sudo chown -R "$(logname)":"$(logname)" "$project_dir"
      ok "Created folder: $project_dir"
    else
      err "Aborted."
      return 1
    fi
  fi
  
  # Create basic index.html
  cat > "$project_dir/index.html" <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>$domain</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #333; }
        .info { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 $domain</h1>
        <div class="info">
            <h3>Supreme Development Environment</h3>
            <p><strong>Domain:</strong> <a href="http$([ "$DEFAULT_PROTOCOL" == "https" ] && echo 's')://$domain">http$([ "$DEFAULT_PROTOCOL" == "https" ] && echo 's')://$domain</a></p>
            <p><strong>Project Path:</strong> $project_dir</p>
            <p><strong>Mode:</strong> Quick (Custom Domain)</p>
        </div>
        <p>Your project is ready! Just add your files to this directory.</p>
    </div>
</body>
</html>
EOF
  
  # Create vhost entry
  create_custom_vhost "$domain" "$project_dir"
  
  # Add hosts entry
  if ! grep -q "$domain" /etc/hosts; then
    echo "127.0.0.1    $domain" | sudo tee -a /etc/hosts >/dev/null
    ok "Added $domain to /etc/hosts"
  else
    echo "/etc/hosts already contains $domain"
  fi
  
  ok "Quick project created: $domain"
  ok "Access your project at: http$([ "$DEFAULT_PROTOCOL" == "https" ] && echo 's')://$domain"
}

# ----------------------
# Custom Vhost Creation
# ----------------------
create_custom_vhost() {
  local domain="$1"
  local project_dir="$2"
  
  # Create vhost entry
  local vhost_entry="
<VirtualHost *:443>
    ServerName $domain
    DocumentRoot \"$project_dir\"

    SSLEngine on
    SSLCertificateFile \"$CERT_DIR/_wildcard.$TLD.pem\"
    SSLCertificateKeyFile \"$CERT_DIR/_wildcard.$TLD-key.pem\"

    <Directory \"$project_dir\">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>

<VirtualHost *:80>
    ServerName $domain
    DocumentRoot \"$project_dir\"

    <Directory \"$project_dir\">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
"

  # Add to vhosts file
  log "Adding VirtualHost to $VHOSTS_PATH"
  echo "$vhost_entry" | sudo tee -a "$VHOSTS_PATH" >/dev/null
  
  ok "VirtualHost added for $domain"
}

# ----------------------
# List Projects (Both Modes)
# ----------------------
list_projects() {
  load_virtualhost_config
  echo "Projects under $HTDOCS_ROOT:"
  echo "Mode: $VIRTUALHOST_MODE"
  echo
  
  if [[ -d "$HTDOCS_ROOT" ]]; then
    ls -1 "$HTDOCS_ROOT" | while read -r project; do
      if [[ -d "$HTDOCS_ROOT/$project" ]]; then
        echo "📁 $project"
        if [[ "$VIRTUALHOST_MODE" == "simple" ]]; then
          echo "   URL: http$([ "$DEFAULT_PROTOCOL" == "https" ] && echo 's')://$project.$TLD (automatic)"
        else
          if [[ -L "$site_enabled_dir/$project.conf" ]]; then
            echo "   URL: http$([ "$DEFAULT_PROTOCOL" == "https" ] && echo 's')://$project.$TLD (enabled)"
          else
            echo "   URL: http$([ "$DEFAULT_PROTOCOL" == "https" ] && echo 's')://$project.$TLD (disabled)"
          fi
        fi
        echo
      fi
    done
  else
    echo "No projects found"
  fi
}
