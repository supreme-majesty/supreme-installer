#!/usr/bin/env bash
# Fix Supreme CLI installation

echo "Fixing Supreme CLI installation..."

# Copy the corrected CLI
sudo cp /tmp/supreme-fixed /usr/local/bin/supreme

# Copy missing virtualhost module
sudo cp supreme/modules/virtualhost.sh /usr/local/share/supreme/modules/

# Fix module paths in all modules
for module in /usr/local/share/supreme/modules/*.sh; do
    if [[ -f "$module" ]]; then
        echo "Fixing paths in $(basename "$module")"
        sudo sed -i 's|source "$(dirname "${BASH_SOURCE\[0\]}")/../lib/utils.sh"|source "/usr/local/share/supreme/lib/utils.sh"|g' "$module"
    fi
done

echo "Supreme CLI fixed!"
echo "Testing..."
supreme --help
