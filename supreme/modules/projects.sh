#!/usr/bin/env bash
# Supreme Development Environment - Project Management Module
# Handles project creation, management, and framework-specific operations

# Source utilities
# shellcheck source=lib/utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/../lib/utils.sh"

# ----------------------
# Project Creation
# ----------------------
create_basic_project() {
  local name="$1"
  local project_dir="$HTDOCS_ROOT/$name"
  
  if [[ -d "$project_dir" ]]; then
    warn "Project folder already exists: $project_dir"
    return 0
  fi
  
  sudo mkdir -p "$project_dir"
  sudo chown -R "$(logname)":"$(logname)" "$project_dir"
  echo "<html><body><h1>$name</h1></body></html>" > "$project_dir/index.html"
  
  ok "Created project folder: $project_dir"
}

create_framework_project() {
  local framework="$1"
  local name="$2"
  local project_dir="$HTDOCS_ROOT/$name"
  
  if [[ -d "$project_dir" ]]; then
    err "Project folder already exists: $project_dir"
    return 1
  fi
  
  log "Creating $framework project: $name"
  
  case "$framework" in
    laravel)
      if command -v composer &>/dev/null; then
        composer create-project laravel/laravel "$project_dir"
      elif command -v docker &>/dev/null; then
        docker run --rm -v "$(pwd)":/app composer create-project laravel/laravel "$name"
        mv "$name" "$project_dir"
      else
        err "Composer or Docker not found. Please install Composer to create Laravel projects."
        return 1
      fi
      ;;
      
    wordpress)
      if command -v wp &>/dev/null; then
        wp core download --path="$project_dir"
      else
        curl -L "https://wordpress.org/latest.tar.gz" | tar -xz -C "$HTDOCS_ROOT"
        mv "$HTDOCS_ROOT/wordpress" "$project_dir"
      fi
      
      # Create database for WordPress
      if [[ "$ENABLE_DB" == "Y" ]]; then
        local db_name="${name}_wp"
        log "Creating database: $db_name"
        if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
          $DB_CMD -u "$DB_ROOT_USER" -p -e "CREATE DATABASE IF NOT EXISTS \`$db_name\`;"
        else
          $DB_CMD -u "$DB_ROOT_USER" -e "CREATE DATABASE IF NOT EXISTS \`$db_name\`;"
        fi
        ok "Database '$db_name' created for WordPress"
      fi
      ;;
      
    react)
      if command -v npx &>/dev/null; then
        npx create-react-app "$project_dir"
      else
        err "Node.js/npm not found. Please install Node.js to create React projects."
        return 1
      fi
      ;;
      
    vue)
      if command -v vue &>/dev/null; then
        vue create "$project_dir"
      elif command -v npx &>/dev/null; then
        npx @vue/cli create "$project_dir"
      else
        err "Vue CLI or Node.js not found. Please install Node.js to create Vue projects."
        return 1
      fi
      ;;
      
    angular)
      if command -v ng &>/dev/null; then
        ng new "$name" --directory="$project_dir"
      elif command -v npx &>/dev/null; then
        npx @angular/cli new "$name" --directory="$project_dir"
      else
        err "Angular CLI or Node.js not found. Please install Node.js to create Angular projects."
        return 1
      fi
      ;;
      
    nextjs)
      if command -v npx &>/dev/null; then
        npx create-next-app@latest "$project_dir"
      else
        err "Node.js/npm not found. Please install Node.js to create Next.js projects."
        return 1
      fi
      ;;
      
    express)
      if command -v npx &>/dev/null; then
        mkdir -p "$project_dir"
        cd "$project_dir"
        npm init -y
        npm install express
        cat > index.js <<'EOF'
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
EOF
        cd - > /dev/null
      else
        err "Node.js/npm not found. Please install Node.js to create Express projects."
        return 1
      fi
      ;;
      
    flask)
      if command -v python3 &>/dev/null; then
        mkdir -p "$project_dir"
        cd "$project_dir"
        python3 -m venv venv
        source venv/bin/activate
        pip install flask
        cat > app.py <<'EOF'
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello, World!'

if __name__ == '__main__':
    app.run(debug=True)
EOF
        cd - > /dev/null
      else
        err "Python3 not found. Please install Python to create Flask projects."
        return 1
      fi
      ;;
      
    django)
      if command -v django-admin &>/dev/null; then
        django-admin startproject "$name" "$project_dir"
      elif command -v python3 &>/dev/null; then
        python3 -m django startproject "$name" "$project_dir"
      else
        err "Django or Python3 not found. Please install Python and Django to create Django projects."
        return 1
      fi
      ;;
      
    *)
      err "Unknown framework: $framework"
      echo "Available frameworks: laravel, wordpress, react, vue, angular, nextjs, express, flask, django"
      return 1
      ;;
  esac
  
  # Set proper ownership
  sudo chown -R "$(logname)":"$(logname)" "$project_dir"
  
  # If it's a Laravel project, create .htaccess file
  if [[ "$framework" == "laravel" && -d "$project_dir/public" ]]; then
    log "Creating .htaccess file for Laravel project"
    cat > "$project_dir/public/.htaccess" <<HTACCESS
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # Handle Authorization Header
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirect Trailing Slashes If Not A Folder...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Send Requests To Front Controller...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
HTACCESS
    ok "Created .htaccess file for Laravel project"
  fi
  
  return 0
}

# ----------------------
# Virtual Host Management
# ----------------------
create_vhost() {
  local name="$1"
  local project_dir="$HTDOCS_ROOT/$name"
  local vfile="$site_available_dir/$name.conf"
  
  if [[ -f "$vfile" ]]; then
    warn "Vhost already exists: $vfile"
    return 0
  fi
  
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
  
  ok "Added vhost for $name.$TLD"
}

# ----------------------
# Hosts File Management
# ----------------------
add_hosts_entry() {
  local name="$1"
  
  if ! grep -q "$name.$TLD" /etc/hosts; then
    echo "127.0.0.1    $name.$TLD" | sudo tee -a /etc/hosts >/dev/null
    ok "Added /etc/hosts entry for $name.$TLD"
  else
    echo "/etc/hosts already contains $name.$TLD"
  fi
}

# ----------------------
# Project Status
# ----------------------
get_project_status() {
  local name="$1"
  local project_dir="$HTDOCS_ROOT/$name"
  local vfile_available="$site_available_dir/$name.conf"
  local vfile_enabled="$site_enabled_dir/$name.conf"
  
  echo "Project Status: $name"
  echo "=================="
  
  if [[ -d "$project_dir" ]]; then
    echo "Project folder: ✓ Present ($project_dir)"
    echo "Folder size: $(du -sh "$project_dir" | cut -f1)"
  else
    echo "Project folder: ✗ Not found"
  fi
  
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
  
  if grep -q "$name.$TLD" /etc/hosts; then
    echo "Hosts entry: ✓ Present"
  else
    echo "Hosts entry: ✗ Missing"
  fi
  
  # Check for database if enabled
  if [[ "$ENABLE_DB" == "Y" ]]; then
    local db_name="${name}_wp"
    if [[ "$DB_ROOT_PASSWORD" == "REQUIRED" ]]; then
      if echo "SHOW DATABASES;" | $DB_CMD -u "$DB_ROOT_USER" -p 2>/dev/null | grep -q "$db_name"; then
        echo "Database: ✓ Present ($db_name)"
      else
        echo "Database: ✗ Not found"
      fi
    else
      if echo "SHOW DATABASES;" | $DB_CMD -u "$DB_ROOT_USER" 2>/dev/null | grep -q "$db_name"; then
        echo "Database: ✓ Present ($db_name)"
      else
        echo "Database: ✗ Not found"
      fi
    fi
  fi
}
