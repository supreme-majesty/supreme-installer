#!/usr/bin/env bash
# Update installed Supreme modules

echo "🔄 Updating installed Supreme modules..."

# Copy updated modules
sudo cp /home/supreme-majesty/Documents/scripts/dev-env/supreme/modules/virtualhost.sh /usr/local/share/supreme/modules/
sudo cp /home/supreme-majesty/Documents/scripts/dev-env/supreme/modules/projects.sh /usr/local/share/supreme/modules/

# Fix module paths to use absolute paths
for module in /usr/local/share/supreme/modules/*.sh; do
  if [[ -f "$module" ]]; then
    sudo sed -i 's|source "$(dirname "${BASH_SOURCE\[0\]}")/../lib/utils.sh"|source "/usr/local/share/supreme/lib/utils.sh"|g' "$module"
  fi
done

echo "✅ Supreme modules updated!"
echo "🧪 Testing updated list_projects function..."

# Test the updated function
source /usr/local/share/supreme/lib/utils.sh
load_config
source /usr/local/share/supreme/modules/virtualhost.sh
list_projects | head -10
