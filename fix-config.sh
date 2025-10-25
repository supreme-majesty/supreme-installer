#!/usr/bin/env bash
# Fix Supreme configuration to use correct XAMPP paths

echo "Fixing Supreme configuration..."

# Backup current config
cp /home/supreme-majesty/.supreme/config.env /home/supreme-majesty/.supreme/config.env.backup

# Create corrected config
cat > /home/supreme-majesty/.supreme/config.env << 'EOF'
PLATFORM=linux
VHOSTS_PATH=/opt/lampp/etc/extra/httpd-vhosts.conf
APACHE_RESTART_CMD="sudo /opt/lampp/lampp restart"
CERT_DIR=/opt/lampp/etc/ssl
HTDOCS_ROOT=/opt/lampp/htdocs
SYS_CONF=/etc/supreme
TLD=test
PROJECT_FOLDER=codes
DEFAULT_PROTOCOL=https
ENABLE_DB=Y
DB_HOST=localhost
DB_PORT=3306
DB_ROOT_USER=root
DB_ROOT_PASSWORD=
DB_CMD=mysql
DB_SERVICE_CMD="sudo /opt/lampp/lampp"
VIRTUALHOST_MODE=advanced
EOF

echo "Configuration fixed!"
echo "Testing SSL status..."
cd /tmp
supreme ssl status
