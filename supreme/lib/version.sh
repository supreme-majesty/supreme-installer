#!/usr/bin/env bash
# Supreme Development Environment - Version Management

# Default version if not set
SUPREME_VERSION="4.0.0"
BUILD_DATE="${BUILD_DATE:-$(date -u +'%Y-%m-%dT%H:%M:%SZ')}"
GIT_COMMIT="${GIT_COMMIT:-$(git rev-parse HEAD 2>/dev/null || echo 'unknown')}"

# Load version from file if it exists
if [[ -f "$(dirname "${BASH_SOURCE[0]}")/../version" ]]; then
  # shellcheck source=version
  source "$(dirname "${BASH_SOURCE[0]}")/../version"
fi

get_version() {
  echo "$SUPREME_VERSION"
}

get_build_info() {
  echo "Supreme Development Environment v$SUPREME_VERSION"
  echo "Build Date: $BUILD_DATE"
  echo "Git Commit: $GIT_COMMIT"
}

show_version() {
  get_build_info
  echo
  echo "Platform: $(uname -s) $(uname -m)"
  echo "Architecture: $(detect_architecture)"
  echo "Service Manager: $(detect_service_manager)"
  echo "Shell: $SHELL"
  echo "User: $(whoami)"
  
  # Show package manager
  local pkg_mgr=$(detect_package_manager "$(detect_platform)")
  if [[ "$pkg_mgr" != "unknown" ]]; then
    echo "Package Manager: $pkg_mgr"
  fi
  
  if command -v php &>/dev/null; then
    echo "PHP: $(php --version | head -1)"
  fi
  
  if command -v node &>/dev/null; then
    echo "Node.js: $(node --version)"
  fi
  
  if command -v python3 &>/dev/null; then
    echo "Python: $(python3 --version)"
  fi
  
  if command -v docker &>/dev/null; then
    echo "Docker: $(docker --version)"
  fi
  
  if command -v mysql &>/dev/null; then
    echo "MySQL: $(mysql --version | head -1)"
  fi
  
  if command -v psql &>/dev/null; then
    echo "PostgreSQL: $(psql --version)"
  fi
}
