#!/usr/bin/env bash
# Supreme Development Environment - Cloud Sync Module
# Handles synchronization of config, SSL certs, and projects across devices

# Source utilities
# shellcheck source=lib/utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/../lib/utils.sh"

# ----------------------
# Sync Configuration
# ----------------------
SYNC_CONFIG_FILE="$SUPREME_CONFIG_DIR/sync.json"
SYNC_TEMP_DIR="/tmp/supreme-sync-$$"
SYNC_ENCRYPTION_KEY_FILE="$SUPREME_CONFIG_DIR/sync.key"

# ----------------------
# Sync Backend Detection
# ----------------------
detect_sync_backend() {
  if [[ -f "$SYNC_CONFIG_FILE" ]]; then
    local backend=$(jq -r '.backend // "none"' "$SYNC_CONFIG_FILE" 2>/dev/null)
    echo "$backend"
  else
    echo "none"
  fi
}

# ----------------------
# Sync Setup Functions
# ----------------------
setup_sync_github() {
  log "Setting up GitHub sync backend..."
  
  # Check if git is available
  if ! command -v git &>/dev/null; then
    err "Git is required for GitHub sync"
    return 1
  fi
  
  # Check if gh CLI is available
  if ! command -v gh &>/dev/null; then
    warn "GitHub CLI (gh) not found. Installing..."
    case "$PLATFORM" in
      linux)
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt-get update
        sudo apt-get install gh -y
        ;;
      macos)
        if command -v brew &>/dev/null; then
          brew install gh
        else
          err "Homebrew required for GitHub CLI installation on macOS"
          return 1
        fi
        ;;
      windows)
        # Use winget or choco
        if command -v winget &>/dev/null; then
          winget install GitHub.cli
        elif command -v choco &>/dev/null; then
          choco install gh
        else
          err "No package manager found for GitHub CLI installation on Windows"
          return 1
        fi
        ;;
    esac
  fi
  
  # Authenticate with GitHub
  if ! gh auth status &>/dev/null; then
    log "Authenticating with GitHub..."
    gh auth login
  fi
  
  # Get user info
  local username=$(gh api user --jq '.login')
  if [[ -z "$username" ]]; then
    err "Failed to get GitHub username"
    return 1
  fi
  
  # Create or use existing private repo
  local repo_name="supreme-sync"
  local repo_url="https://github.com/$username/$repo_name.git"
  
  # Check if repo exists
  if ! gh repo view "$username/$repo_name" &>/dev/null; then
    log "Creating private repository: $repo_name"
    gh repo create "$repo_name" --private --description "Supreme Development Environment sync storage"
  fi
  
  # Create sync config
  mkdir -p "$SUPREME_CONFIG_DIR"
  cat > "$SYNC_CONFIG_FILE" << EOF
{
  "backend": "github",
  "repo": "$repo_url",
  "username": "$username",
  "last_sync": null,
  "encrypted": true
}
EOF
  
  # Generate encryption key if not exists
  if [[ ! -f "$SYNC_ENCRYPTION_KEY_FILE" ]]; then
    openssl rand -base64 32 > "$SYNC_ENCRYPTION_KEY_FILE"
    chmod 600 "$SYNC_ENCRYPTION_KEY_FILE"
  fi
  
  ok "GitHub sync configured successfully"
  ok "Repository: $repo_url"
  ok "Encryption: Enabled"
}

setup_sync_gitlab() {
  log "Setting up GitLab sync backend..."
  
  # Check if git is available
  if ! command -v git &>/dev/null; then
    err "Git is required for GitLab sync"
    return 1
  fi
  
  # Get GitLab instance URL
  read -rp "Enter GitLab instance URL (default: https://gitlab.com): " gitlab_url
  gitlab_url=${gitlab_url:-https://gitlab.com}
  
  # Get access token
  read -rp "Enter GitLab access token: " gitlab_token
  if [[ -z "$gitlab_token" ]]; then
    err "GitLab access token is required"
    return 1
  fi
  
  # Get username
  read -rp "Enter GitLab username: " gitlab_username
  if [[ -z "$gitlab_username" ]]; then
    err "GitLab username is required"
    return 1
  fi
  
  # Create or use existing private project
  local project_name="supreme-sync"
  local project_url="$gitlab_url/$gitlab_username/$project_name.git"
  
  # Test connection
  if ! git ls-remote "$project_url" &>/dev/null; then
    log "Creating private project: $project_name"
    # Note: GitLab API would be needed here for project creation
    warn "Please create a private project '$project_name' manually in GitLab"
    read -rp "Press Enter when project is created..."
  fi
  
  # Create sync config
  mkdir -p "$SUPREME_CONFIG_DIR"
  cat > "$SYNC_CONFIG_FILE" << EOF
{
  "backend": "gitlab",
  "repo": "$project_url",
  "username": "$gitlab_username",
  "instance": "$gitlab_url",
  "token": "$gitlab_token",
  "last_sync": null,
  "encrypted": true
}
EOF
  
  # Generate encryption key if not exists
  if [[ ! -f "$SYNC_ENCRYPTION_KEY_FILE" ]]; then
    openssl rand -base64 32 > "$SYNC_ENCRYPTION_KEY_FILE"
    chmod 600 "$SYNC_ENCRYPTION_KEY_FILE"
  fi
  
  ok "GitLab sync configured successfully"
  ok "Repository: $project_url"
  ok "Encryption: Enabled"
}

# ----------------------
# Encryption Functions
# ----------------------
encrypt_data() {
  local data="$1"
  local output_file="$2"
  
  if [[ ! -f "$SYNC_ENCRYPTION_KEY_FILE" ]]; then
    err "Encryption key not found"
    return 1
  fi
  
  echo "$data" | openssl enc -aes-256-cbc -base64 -pass file:"$SYNC_ENCRYPTION_KEY_FILE" > "$output_file"
}

decrypt_data() {
  local encrypted_file="$1"
  
  if [[ ! -f "$SYNC_ENCRYPTION_KEY_FILE" ]]; then
    err "Encryption key not found"
    return 1
  fi
  
  openssl enc -aes-256-cbc -base64 -d -pass file:"$SYNC_ENCRYPTION_KEY_FILE" -in "$encrypted_file"
}

# ----------------------
# Sync Operations
# ----------------------
sync_push() {
  local backend=$(detect_sync_backend)
  
  if [[ "$backend" == "none" ]]; then
    err "No sync backend configured. Run 'supreme sync setup' first."
    return 1
  fi
  
  log "Pushing configuration to $backend..."
  
  # Create temp directory
  mkdir -p "$SYNC_TEMP_DIR"
  
  # Copy SSL certificates
  if [[ -d "$SSL_DIR" ]]; then
    mkdir -p "$SYNC_TEMP_DIR/ssl"
    cp -r "$SSL_DIR"/* "$SYNC_TEMP_DIR/ssl/" 2>/dev/null || true
  fi
  
  # Copy configuration files
  if [[ -d "$SUPREME_CONFIG_DIR" ]]; then
    mkdir -p "$SYNC_TEMP_DIR/config"
    cp -r "$SUPREME_CONFIG_DIR"/* "$SYNC_TEMP_DIR/config/" 2>/dev/null || true
  fi
  
  # Copy project list (optional)
  if [[ -d "$HTDOCS_ROOT" ]]; then
    mkdir -p "$SYNC_TEMP_DIR/projects"
    find "$HTDOCS_ROOT" -maxdepth 1 -type d -not -path "$HTDOCS_ROOT" -exec basename {} \; > "$SYNC_TEMP_DIR/projects/list.txt" 2>/dev/null || true
  fi
  
  # Create metadata
  cat > "$SYNC_TEMP_DIR/metadata.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platform": "$PLATFORM",
  "version": "$SUPREME_VERSION",
  "ssl_dir": "$SSL_DIR",
  "config_dir": "$SUPREME_CONFIG_DIR",
  "htdocs_root": "$HTDOCS_ROOT"
}
EOF
  
  # Encrypt sensitive data
  if [[ -f "$SYNC_TEMP_DIR/ssl"/*.pem ]]; then
    encrypt_data "$(cat "$SYNC_TEMP_DIR/ssl"/*.pem)" "$SYNC_TEMP_DIR/ssl-encrypted.pem"
    rm -rf "$SYNC_TEMP_DIR/ssl"
  fi
  
  # Push to backend
  case "$backend" in
    github)
      sync_push_github
      ;;
    gitlab)
      sync_push_gitlab
      ;;
    *)
      err "Unsupported backend: $backend"
      return 1
      ;;
  esac
  
  # Update last sync timestamp
  jq --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.last_sync = $timestamp' "$SYNC_CONFIG_FILE" > "$SYNC_CONFIG_FILE.tmp" && mv "$SYNC_CONFIG_FILE.tmp" "$SYNC_CONFIG_FILE"
  
  # Cleanup
  rm -rf "$SYNC_TEMP_DIR"
  
  ok "Configuration pushed successfully"
}

sync_pull() {
  local backend=$(detect_sync_backend)
  
  if [[ "$backend" == "none" ]]; then
    err "No sync backend configured. Run 'supreme sync setup' first."
    return 1
  fi
  
  log "Pulling configuration from $backend..."
  
  # Create temp directory
  mkdir -p "$SYNC_TEMP_DIR"
  
  # Pull from backend
  case "$backend" in
    github)
      sync_pull_github
      ;;
    gitlab)
      sync_pull_gitlab
      ;;
    *)
      err "Unsupported backend: $backend"
      return 1
      ;;
  esac
  
  # Restore SSL certificates
  if [[ -f "$SYNC_TEMP_DIR/ssl-encrypted.pem" ]]; then
    mkdir -p "$SSL_DIR"
    decrypt_data "$SYNC_TEMP_DIR/ssl-encrypted.pem" > "$SSL_DIR/_wildcard.$TLD.pem"
    # Note: Key file would need separate handling
  fi
  
  # Restore configuration files
  if [[ -d "$SYNC_TEMP_DIR/config" ]]; then
    cp -r "$SYNC_TEMP_DIR/config"/* "$SUPREME_CONFIG_DIR/" 2>/dev/null || true
  fi
  
  # Update last sync timestamp
  jq --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.last_sync = $timestamp' "$SYNC_CONFIG_FILE" > "$SYNC_CONFIG_FILE.tmp" && mv "$SYNC_CONFIG_FILE.tmp" "$SYNC_CONFIG_FILE"
  
  # Cleanup
  rm -rf "$SYNC_TEMP_DIR"
  
  ok "Configuration pulled successfully"
}

# ----------------------
# Backend-specific Functions
# ----------------------
sync_push_github() {
  local repo_url=$(jq -r '.repo' "$SYNC_CONFIG_FILE")
  local temp_repo="$SYNC_TEMP_DIR/repo"
  
  # Clone or update repo
  if [[ -d "$temp_repo" ]]; then
    cd "$temp_repo"
    git pull origin main
  else
    git clone "$repo_url" "$temp_repo"
    cd "$temp_repo"
  fi
  
  # Copy files
  cp -r "$SYNC_TEMP_DIR"/* ./
  
  # Commit and push
  git add .
  git commit -m "Supreme sync: $(date -u +%Y-%m-%dT%H:%M:%SZ)" || true
  git push origin main
}

sync_pull_github() {
  local repo_url=$(jq -r '.repo' "$SYNC_CONFIG_FILE")
  local temp_repo="$SYNC_TEMP_DIR/repo"
  
  # Clone repo
  git clone "$repo_url" "$temp_repo"
  cd "$temp_repo"
  
  # Copy files to temp directory
  cp -r ./* "$SYNC_TEMP_DIR/"
}

sync_push_gitlab() {
  local repo_url=$(jq -r '.repo' "$SYNC_CONFIG_FILE")
  local token=$(jq -r '.token' "$SYNC_CONFIG_FILE")
  local temp_repo="$SYNC_TEMP_DIR/repo"
  
  # Clone or update repo
  if [[ -d "$temp_repo" ]]; then
    cd "$temp_repo"
    git pull origin main
  else
    git clone "$repo_url" "$temp_repo"
    cd "$temp_repo"
  fi
  
  # Copy files
  cp -r "$SYNC_TEMP_DIR"/* ./
  
  # Commit and push
  git add .
  git commit -m "Supreme sync: $(date -u +%Y-%m-%dT%H:%M:%SZ)" || true
  git push origin main
}

sync_pull_gitlab() {
  local repo_url=$(jq -r '.repo' "$SYNC_CONFIG_FILE")
  local temp_repo="$SYNC_TEMP_DIR/repo"
  
  # Clone repo
  git clone "$repo_url" "$temp_repo"
  cd "$temp_repo"
  
  # Copy files to temp directory
  cp -r ./* "$SYNC_TEMP_DIR/"
}

# ----------------------
# Sync Status
# ----------------------
sync_status() {
  local backend=$(detect_sync_backend)
  
  if [[ "$backend" == "none" ]]; then
    warn "No sync backend configured"
    echo "Run 'supreme sync setup' to configure cloud sync"
    return 1
  fi
  
  log "Sync Status"
  echo "==========="
  echo "Backend: $backend"
  
  if [[ -f "$SYNC_CONFIG_FILE" ]]; then
    local repo=$(jq -r '.repo // "N/A"' "$SYNC_CONFIG_FILE")
    local last_sync=$(jq -r '.last_sync // "Never"' "$SYNC_CONFIG_FILE")
    local encrypted=$(jq -r '.encrypted // false' "$SYNC_CONFIG_FILE")
    
    echo "Repository: $repo"
    echo "Last Sync: $last_sync"
    echo "Encrypted: $encrypted"
  fi
  
  # Check if encryption key exists
  if [[ -f "$SYNC_ENCRYPTION_KEY_FILE" ]]; then
    echo "Encryption Key: ✓ Present"
  else
    echo "Encryption Key: ✗ Missing"
  fi
}

# ----------------------
# Sync Reset
# ----------------------
sync_reset() {
  if confirm "This will remove all sync configuration and data. Continue?"; then
    rm -f "$SYNC_CONFIG_FILE"
    rm -f "$SYNC_ENCRYPTION_KEY_FILE"
    ok "Sync configuration reset"
  else
    log "Sync reset cancelled"
  fi
}
