#!/usr/bin/env bash
# Supreme Development Environment - SSL Management Module
# Handles SSL certificate creation, renewal, and management

# Source utilities
# shellcheck source=lib/utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/../lib/utils.sh"

# ----------------------
# Install mkcert
# ----------------------
install_mkcert() {
  if command -v mkcert &>/dev/null; then
    ok "mkcert already installed."
    return 0
  fi
  
  log "Installing mkcert..."
  
  case "$PLATFORM" in
    macos)
      if command -v brew &>/dev/null; then
        brew install mkcert nss || true
      else
        err "Homebrew not found — please install Homebrew and re-run mkcert installation manually."
        return 1
      fi
      ;;
    windows)
      curl -L -o mkcert.exe "https://dl.filippo.io/mkcert/latest?for=windows/amd64"
      sudo mv mkcert.exe /usr/local/bin/mkcert.exe
      sudo chmod +x /usr/local/bin/mkcert.exe
      ;;
    linux)
      # Try package managers first
      if command -v apt &>/dev/null; then
        sudo apt-get update -y
        sudo apt-get install -y libnss3-tools curl ca-certificates || true
      elif command -v dnf &>/dev/null; then
        sudo dnf install -y nss-tools curl ca-certificates || true
      fi
      
      # Download binary
      local ARCH
      ARCH="$(uname -m)"
      case "$ARCH" in
        x86_64)
          curl -L -o /usr/local/bin/mkcert "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
          ;;
        aarch64|arm64)
          curl -L -o /usr/local/bin/mkcert "https://dl.filippo.io/mkcert/latest?for=linux/arm64"
          ;;
        *)
          curl -L -o /usr/local/bin/mkcert "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
          ;;
      esac
      sudo chmod +x /usr/local/bin/mkcert
      ;;
  esac
  
  ok "mkcert installed."
}

# ----------------------
# Create Wildcard Certificate
# ----------------------
create_wildcard_cert() {
  install_mkcert
  
  # Ensure mkcert CA is installed into the interactive user's trust store
  log "Installing mkcert root CA (if not already)..."
  sudo -u "$(logname)" mkcert -install || true
  
  cd "$SSL_DIR"
  sudo -u "$(logname)" mkcert "*.$TLD"
  sudo chown -R root:root "$SSL_DIR"
  sudo chmod -R 644 "$SSL_DIR"/*.pem || true
  
  ok "Wildcard certificate created at $SSL_DIR/_wildcard.$TLD.pem (and key)."
}

# ----------------------
# Renew Certificate
# ----------------------
renew_certificate() {
  if [[ ! -f "$CERT_DIR/_wildcard.$TLD.pem" ]]; then
    err "Wildcard certificate not found. Run 'supreme enable https' first."
    return 1
  fi
  
  # Backup existing certificate
  if [[ -f "$CERT_DIR/_wildcard.$TLD.pem" ]]; then
    cp "$CERT_DIR/_wildcard.$TLD.pem" "$CERT_DIR/_wildcard.$TLD.pem.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$CERT_DIR/_wildcard.$TLD-key.pem" "$CERT_DIR/_wildcard.$TLD-key.pem.backup.$(date +%Y%m%d_%H%M%S)"
    ok "Backed up existing certificates"
  fi
  
  # Generate new certificate
  cd "$CERT_DIR"
  sudo -u "$(logname)" mkcert "*.$TLD"
  sudo chown root:root "$CERT_DIR"/*.pem
  sudo chmod 644 "$CERT_DIR"/*.pem
  
  ok "Wildcard certificate renewed successfully"
}

# ----------------------
# Check Certificate Status
# ----------------------
check_certificate_status() {
  log "SSL Certificate Status"
  echo "======================"
  
  if command -v mkcert &>/dev/null; then
    echo "mkcert: ✓ Installed"
  else
    echo "mkcert: ✗ Not found"
  fi
  
  if [[ -f "$CERT_DIR/_wildcard.$TLD.pem" ]]; then
    echo "Wildcard cert: ✓ Present"
    echo "Certificate file: $CERT_DIR/_wildcard.$TLD.pem"
    echo "Key file: $CERT_DIR/_wildcard.$TLD-key.pem"
    
    # Show certificate details
    if command -v openssl &>/dev/null; then
      echo
      echo "Certificate Details:"
      openssl x509 -in "$CERT_DIR/_wildcard.$TLD.pem" -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After:)" | head -4
    fi
  else
    echo "Wildcard cert: ✗ Not found"
  fi
  
  # Check if CA is installed
  case "$PLATFORM" in
    macos)
      if security find-certificate -c "mkcert" &>/dev/null; then
        echo "CA Certificate: ✓ Installed in system keychain"
      else
        echo "CA Certificate: ✗ Not installed"
      fi
      ;;
    linux)
      if [[ -f "/usr/local/share/ca-certificates/mkcert-rootCA.pem" ]] || [[ -f "/etc/ssl/certs/mkcert-rootCA.pem" ]]; then
        echo "CA Certificate: ✓ Installed in system trust store"
      else
        echo "CA Certificate: ✗ Not installed"
      fi
      ;;
    windows)
      echo "CA Certificate: Check Windows certificate store manually"
      ;;
  esac
}

# ----------------------
# Install CA Certificate
# ----------------------
install_ca_certificate() {
  if ! command -v mkcert &>/dev/null; then
    err "mkcert not found. Please install mkcert first."
    return 1
  fi
  
  sudo -u "$(logname)" mkcert -install
  ok "mkcert CA certificate installed"
}
