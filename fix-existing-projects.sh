#!/usr/bin/env bash
# Quick fix to configure all existing projects

echo "🔧 Configuring all existing projects..."

# Load Supreme modules
source /usr/local/share/supreme/lib/utils.sh
load_config
source /usr/local/share/supreme/modules/virtualhost.sh

PROJECTS_DIR="/opt/lampp/htdocs/codes"
echo "📁 Found projects in: $PROJECTS_DIR"

# Configure each project
for project_dir in "$PROJECTS_DIR"/*; do
    if [ -d "$project_dir" ]; then
        project_name=$(basename "$project_dir")
        echo "⚙️  Configuring: $project_name"
        
        # Create vhost file
        create_advanced_project "$project_name"
    fi
done

echo "✅ All projects configured!"
echo "🔄 Restarting Apache..."

# Restart Apache
/opt/lampp/lampp restart

echo "🌐 Your projects are now accessible at:"
for project_dir in "$PROJECTS_DIR"/*; do
    if [ -d "$project_dir" ]; then
        project_name=$(basename "$project_dir")
        echo "  - https://$project_name.test"
    fi
done
