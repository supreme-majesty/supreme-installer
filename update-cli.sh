#!/usr/bin/env bash
# Update Supreme CLI

echo "🔄 Updating Supreme CLI..."

# Copy the updated CLI
sudo cp /home/supreme-majesty/Documents/scripts/dev-env/supreme/cli/supreme /usr/local/bin/supreme
sudo chmod +x /usr/local/bin/supreme

echo "✅ Supreme CLI updated!"
echo "🧪 Testing new update command..."

# Test the update command
supreme update
