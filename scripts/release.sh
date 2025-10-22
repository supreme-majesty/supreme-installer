#!/usr/bin/env bash
# Supreme Development Environment - Release Script
# Creates a new release with proper versioning and tagging

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
ok() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  err "Not in a git repository"
  exit 1
fi

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
  err "You have uncommitted changes. Please commit or stash them first."
  exit 1
fi

# Get current version
CURRENT_VERSION=$(grep -E '^SUPREME_VERSION=' supreme/lib/version.sh | cut -d'=' -f2 | tr -d '"')
if [[ -z "$CURRENT_VERSION" ]]; then
  CURRENT_VERSION="1.0.0"
fi

echo "Current version: $CURRENT_VERSION"
echo

# Ask for new version
read -rp "Enter new version (current: $CURRENT_VERSION): " NEW_VERSION
if [[ -z "$NEW_VERSION" ]]; then
  NEW_VERSION="$CURRENT_VERSION"
fi

# Validate version format (semantic versioning)
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  err "Invalid version format. Use semantic versioning (e.g., 1.0.0, 1.1.0, 2.0.0)"
  exit 1
fi

# Check if version already exists
if git tag -l | grep -q "v$NEW_VERSION"; then
  err "Version v$NEW_VERSION already exists"
  exit 1
fi

log "Creating release v$NEW_VERSION..."

# Update version in version.sh
sed -i "s/SUPREME_VERSION=.*/SUPREME_VERSION=\"$NEW_VERSION\"/" supreme/lib/version.sh

# Update version in installer
sed -i "s/SUPREME_VERSION=.*/SUPREME_VERSION=\"$NEW_VERSION\"/" supreme-installer.sh

# Create version file (avoid heredoc for shell portability)
printf "%s\n" \
  "SUPREME_VERSION=$NEW_VERSION" \
  "BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  "GIT_COMMIT=$(git rev-parse HEAD)" \
  > supreme/version

# Commit changes
git add supreme/lib/version.sh supreme-installer.sh supreme/version
git commit -m "Bump version to v$NEW_VERSION"

# Create tag
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION

## What's New
- XAMPP-first dependency management
- Interactive installation prompts
- Cross-platform support (Linux, macOS, Windows)
- Framework-specific project templates
- SSL certificate management
- Database operations

## Installation
- **Linux**: Download .deb package
- **Windows**: Download .exe installer
- **macOS**: Download .dmg package

## Quick Start
\`\`\`bash
supreme new myproject
supreme create laravel myapi
supreme dev myapi
\`\`\`"

ok "Version updated to v$NEW_VERSION"
ok "Tag created: v$NEW_VERSION"

# Ask if user wants to push
read -rp "Push to remote repository? [Y/n]: " PUSH
if [[ "$PUSH" =~ ^[Yy]$ ]] || [[ -z "$PUSH" ]]; then
  log "Pushing to remote repository..."
  git push origin main
  git push origin "v$NEW_VERSION"
  ok "Pushed to remote repository"
  
  log "GitHub Actions will now build and release the packages automatically"
  log "Check the Actions tab in your GitHub repository for build progress"
else
  warn "Skipping push. Run 'git push origin main && git push origin v$NEW_VERSION' manually"
fi

ok "Release v$NEW_VERSION created successfully!"
echo
echo "Next steps:"
echo "1. Check GitHub Actions for automated builds"
echo "2. Download packages from the Releases page"
echo "3. Test the installers on different platforms"
echo "4. Update documentation if needed"
