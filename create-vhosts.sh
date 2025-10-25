#!/usr/bin/env bash
# Simple fix for existing projects - create vhost files manually

echo "🔧 Creating vhost files for existing projects..."

PROJECTS_DIR="/opt/lampp/htdocs/codes"
SITES_AVAILABLE="/etc/supreme/sites-available"
SITES_ENABLED="/etc/supreme/sites-enabled"
SSL_DIR="/opt/lampp/etc/ssl"
TLD="test"

# Create vhost files for each project
for project_dir in "$PROJECTS_DIR"/*; do
    if [ -d "$project_dir" ]; then
        project_name=$(basename "$project_dir")
        echo "⚙️  Creating vhost for: $project_name"
        
        # Create vhost file content
        cat > "/tmp/$project_name.conf" <<EOF
<VirtualHost *:443>
    ServerName $project_name.$TLD
    DocumentRoot "$project_dir"
    SSLEngine on
    SSLCertificateFile "$SSL_DIR/_wildcard.$TLD.pem"
    SSLCertificateKeyFile "$SSL_DIR/_wildcard.$TLD-key.pem"
    <Directory "$project_dir">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>

<VirtualHost *:80>
    ServerName $project_name.$TLD
    DocumentRoot "$project_dir"
    <Directory "$project_dir">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
EOF
        
        # Copy to sites-available
        cp "/tmp/$project_name.conf" "$SITES_AVAILABLE/"
        
        # Create symlink in sites-enabled
        ln -sf "$SITES_AVAILABLE/$project_name.conf" "$SITES_ENABLED/$project_name.conf"
        
        # Add to hosts file if not already there
        if ! grep -q "$project_name.$TLD" /etc/hosts; then
            echo "127.0.0.1    $project_name.$TLD" >> /etc/hosts
            echo "  ✓ Added to /etc/hosts"
        fi
        
        echo "  ✓ Created vhost for $project_name.$TLD"
    fi
done

echo "✅ All vhost files created!"
echo "🔄 Please restart Apache manually: sudo /opt/lampp/lampp restart"
echo ""
echo "🌐 Your projects are now accessible at:"
for project_dir in "$PROJECTS_DIR"/*; do
    if [ -d "$project_dir" ]; then
        project_name=$(basename "$project_dir")
        echo "  - https://$project_name.test"
    fi
done
