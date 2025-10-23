#!/usr/bin/env bash
# Supreme Development Environment - Dependency Management Module
# Handles detection, installation, and management of required dependencies

# Source utilities
# shellcheck source=lib/utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/../lib/utils.sh"

# ----------------------
# Dependency Definitions
# ----------------------
declare -A DEPENDENCIES=(
  ["xampp"]="XAMPP (Apache + MySQL + PHP bundle)"
  ["apache"]="Apache web server (system)"
  ["mysql"]="MySQL database server (system)"
  ["postgresql"]="PostgreSQL database server (system)"
  ["php"]="PHP runtime (system)"
  ["composer"]="PHP dependency manager"
  ["node"]="Node.js runtime"
  ["npm"]="Node package manager"
  ["python3"]="Python 3 runtime"
  ["pip"]="Python package manager"
  ["docker"]="Docker container platform"
  ["git"]="Git version control"
  ["curl"]="cURL command line tool"
  ["wget"]="Wget download utility"
)

# Platform-specific package managers
declare -A PACKAGE_MANAGERS=(
  ["apt"]="apt-get"
  ["yum"]="yum"
  ["dnf"]="dnf"
  ["pacman"]="pacman"
  ["apk"]="apk"
  ["emerge"]="emerge"
  ["zypper"]="zypper"
  ["snap"]="snap"
  ["flatpak"]="flatpak"
  ["nix"]="nix"
  ["brew"]="brew"
  ["choco"]="chocolatey"
  ["winget"]="winget"
)

# ----------------------
# Package Manager Detection
# ----------------------
detect_package_manager() {
  local platform="$1"
  
  case "$platform" in
    linux|wsl)
      # Check for traditional package managers first
      if command -v apt &>/dev/null; then
        echo "apt"
      elif command -v yum &>/dev/null; then
        echo "yum"
      elif command -v dnf &>/dev/null; then
        echo "dnf"
      elif command -v pacman &>/dev/null; then
        echo "pacman"
      elif command -v apk &>/dev/null; then
        echo "apk"
      elif command -v emerge &>/dev/null; then
        echo "emerge"
      elif command -v zypper &>/dev/null; then
        echo "zypper"
      # Check for modern package managers
      elif command -v snap &>/dev/null; then
        echo "snap"
      elif command -v flatpak &>/dev/null; then
        echo "flatpak"
      elif command -v nix &>/dev/null; then
        echo "nix"
      else
        echo "unknown"
      fi
      ;;
    macos)
      if command -v brew &>/dev/null; then
        echo "brew"
      elif command -v nix &>/dev/null; then
        echo "nix"
      else
        echo "unknown"
      fi
      ;;
    windows)
      if command -v choco &>/dev/null; then
        echo "choco"
      elif command -v winget &>/dev/null; then
        echo "winget"
      elif command -v scoop &>/dev/null; then
        echo "scoop"
      else
        echo "unknown"
      fi
      ;;
  esac
}

# ----------------------
# XAMPP Detection and Installation
# ----------------------
check_xampp() {
  # Check for XAMPP installation
  [[ -d "/opt/lampp" ]] || [[ -d "/Applications/XAMPP" ]] || [[ -d "/c/xampp" ]] || [[ -d "C:\\xampp" ]]
}

get_xampp_path() {
  if [[ -d "/opt/lampp" ]]; then
    echo "/opt/lampp"
  elif [[ -d "/Applications/XAMPP" ]]; then
    echo "/Applications/XAMPP"
  elif [[ -d "/c/xampp" ]]; then
    echo "/c/xampp"
  elif [[ -d "C:\\xampp" ]]; then
    echo "C:\\xampp"
  else
    echo ""
  fi
}

# ----------------------
# Dependency Detection
# ----------------------
check_dependency() {
  local dep="$1"
  local silent="${2:-false}"
  
  case "$dep" in
    xampp)
      check_xampp
      ;;
    apache)
      # Check for XAMPP first, then system Apache
      if check_xampp; then
        return 0
      else
        command -v apache2ctl &>/dev/null || command -v httpd &>/dev/null
      fi
      ;;
    mysql)
      # Check for XAMPP first, then system MySQL
      if check_xampp; then
        local xampp_path=$(get_xampp_path)
        [[ -f "$xampp_path/bin/mysql" ]] || [[ -f "$xampp_path/mysql/bin/mysql.exe" ]]
      else
        command -v mysql &>/dev/null
      fi
      ;;
    postgresql)
      # Check for system PostgreSQL
      command -v psql &>/dev/null
      ;;
    php)
      # Check for XAMPP first, then system PHP
      if check_xampp; then
        local xampp_path=$(get_xampp_path)
        [[ -f "$xampp_path/bin/php" ]] || [[ -f "$xampp_path/php/php.exe" ]]
      else
        command -v php &>/dev/null
      fi
      ;;
    composer)
      command -v composer &>/dev/null
      ;;
    node)
      command -v node &>/dev/null
      ;;
    npm)
      command -v npm &>/dev/null
      ;;
    python3)
      command -v python3 &>/dev/null
      ;;
    pip)
      command -v pip &>/dev/null || command -v pip3 &>/dev/null
      ;;
    docker)
      command -v docker &>/dev/null
      ;;
    git)
      command -v git &>/dev/null
      ;;
    curl)
      command -v curl &>/dev/null
      ;;
    wget)
      command -v wget &>/dev/null
      ;;
    *)
      command -v "$dep" &>/dev/null
      ;;
  esac
}

# ----------------------
# XAMPP Installation Functions
# ----------------------
install_xampp() {
  local platform="$1"
  
  case "$platform" in
    linux|wsl)
      log "Installing XAMPP for Linux..."
      
      # Detect architecture and choose appropriate XAMPP version
      local arch=$(detect_architecture)
      local xampp_url=""
      
      case "$arch" in
        amd64)
          xampp_url="https://sourceforge.net/projects/xampp/files/XAMPP%20Linux/latest/xampp-linux-x64-latest.run/download"
          ;;
        arm64)
          # XAMPP doesn't have official ARM64 builds, suggest alternative
          warn "XAMPP doesn't have official ARM64 builds for Linux."
          warn "Consider using system packages or Docker instead."
          return 1
          ;;
        arm32)
          # XAMPP doesn't have official ARM32 builds, suggest alternative
          warn "XAMPP doesn't have official ARM32 builds for Linux."
          warn "Consider using system packages or Docker instead."
          return 1
          ;;
        *)
          warn "Unsupported architecture for XAMPP: $arch"
          warn "Consider using system packages or Docker instead."
          return 1
          ;;
      esac
      
      local installer="/tmp/xampp-installer.run"
      
      if ! curl -L -o "$installer" "$xampp_url"; then
        err "Failed to download XAMPP installer"
        return 1
      fi
      
      # Make installer executable
      chmod +x "$installer"
      
      # Install XAMPP
      sudo "$installer" --mode unattended --unattendedmodeui none
      
      # Clean up
      rm -f "$installer"
      
      # Start XAMPP services
      sudo /opt/lampp/lampp start
      
      ok "XAMPP installed and started successfully"
      ;;
      
    macos)
      log "Installing XAMPP for macOS..."
      
      # Detect architecture and choose appropriate XAMPP version
      local arch=$(detect_architecture)
      local xampp_url=""
      
      case "$arch" in
        amd64)
          xampp_url="https://sourceforge.net/projects/xampp/files/XAMPP%20Mac%20OS%20X/latest/xampp-osx-latest.dmg/download"
          ;;
        arm64)
          # XAMPP doesn't have official ARM64 builds for macOS, suggest alternative
          warn "XAMPP doesn't have official ARM64 builds for macOS (Apple Silicon)."
          warn "Consider using Homebrew or Docker instead."
          return 1
          ;;
        *)
          warn "Unsupported architecture for XAMPP on macOS: $arch"
          return 1
          ;;
      esac
      
      local dmg_file="/tmp/xampp.dmg"
      
      if ! curl -L -o "$dmg_file" "$xampp_url"; then
        err "Failed to download XAMPP for macOS"
        return 1
      fi
      
      # Mount and install
      hdiutil attach "$dmg_file"
      sudo cp -R "/Volumes/XAMPP/XAMPP.app" "/Applications/"
      hdiutil detach "/Volumes/XAMPP"
      
      # Clean up
      rm -f "$dmg_file"
      
      # Start XAMPP
      open "/Applications/XAMPP.app"
      
      ok "XAMPP installed successfully. Please start it from Applications."
      ;;
      
    windows)
      log "Installing XAMPP for Windows..."
      
      # Detect architecture and choose appropriate XAMPP version
      local arch=$(detect_architecture)
      local xampp_url=""
      
      case "$arch" in
        amd64)
          xampp_url="https://sourceforge.net/projects/xampp/files/XAMPP%20Windows/latest/xampp-windows-x64-latest.exe/download"
          ;;
        i386)
          xampp_url="https://sourceforge.net/projects/xampp/files/XAMPP%20Windows/latest/xampp-windows-x86-latest.exe/download"
          ;;
        arm64)
          # XAMPP doesn't have official ARM64 builds for Windows, suggest alternative
          warn "XAMPP doesn't have official ARM64 builds for Windows."
          warn "Consider using system packages or Docker instead."
          return 1
          ;;
        *)
          warn "Unsupported architecture for XAMPP on Windows: $arch"
          return 1
          ;;
      esac
      
      local installer="/tmp/xampp-installer.exe"
      
      if ! curl -L -o "$installer" "$xampp_url"; then
        err "Failed to download XAMPP for Windows"
        return 1
      fi
      
      # Run installer
      "$installer" /S
      
      # Clean up
      rm -f "$installer"
      
      ok "XAMPP installed successfully"
      ;;
      
    *)
      err "XAMPP installation not supported on this platform"
      return 1
      ;;
  esac
}

# ----------------------
# Installation Functions
# ----------------------
install_apache() {
  local pkg_mgr="$1"
  
  case "$pkg_mgr" in
    apt)
      sudo apt-get update
      sudo apt-get install -y apache2
      sudo systemctl enable apache2
      sudo systemctl start apache2
      ;;
    yum|dnf)
      sudo "$pkg_mgr" install -y httpd
      sudo systemctl enable httpd
      sudo systemctl start httpd
      ;;
    pacman)
      sudo pacman -S --noconfirm apache
      sudo systemctl enable httpd
      sudo systemctl start httpd
      ;;
    apk)
      sudo apk add --no-cache apache2
      sudo rc-update add apache2
      sudo service apache2 start
      ;;
    emerge)
      sudo emerge --ask=n www-servers/apache
      sudo systemctl enable apache2
      sudo systemctl start apache2
      ;;
    zypper)
      sudo zypper install -y apache2
      sudo systemctl enable apache2
      sudo systemctl start apache2
      ;;
    snap)
      sudo snap install apache2
      sudo systemctl enable snap.apache2.apache2
      sudo systemctl start snap.apache2.apache2
      ;;
    brew)
      brew install httpd
      brew services start httpd
      ;;
    *)
      warn "Cannot install Apache automatically on this system"
      return 1
      ;;
  esac
}

install_mysql() {
  local pkg_mgr="$1"
  
  case "$pkg_mgr" in
    apt)
      sudo apt-get update
      sudo apt-get install -y mysql-server
      sudo systemctl enable mysql
      sudo systemctl start mysql
      ;;
    yum|dnf)
      sudo "$pkg_mgr" install -y mysql-server
      sudo systemctl enable mysqld
      sudo systemctl start mysqld
      ;;
    pacman)
      sudo pacman -S --noconfirm mysql
      sudo systemctl enable mysqld
      sudo systemctl start mysqld
      ;;
    apk)
      sudo apk add --no-cache mysql mysql-client
      sudo rc-update add mysql
      sudo service mysql start
      ;;
    emerge)
      sudo emerge --ask=n dev-db/mysql
      sudo systemctl enable mysql
      sudo systemctl start mysql
      ;;
    zypper)
      sudo zypper install -y mysql
      sudo systemctl enable mysql
      sudo systemctl start mysql
      ;;
    snap)
      sudo snap install mysql
      sudo systemctl enable snap.mysql.mysql
      sudo systemctl start snap.mysql.mysql
      ;;
    brew)
      brew install mysql
      brew services start mysql
      ;;
    *)
      warn "Cannot install MySQL automatically on this system"
      return 1
      ;;
  esac
}

install_postgresql() {
  local pkg_mgr="$1"
  
  case "$pkg_mgr" in
    apt)
      sudo apt-get update
      sudo apt-get install -y postgresql postgresql-contrib
      sudo systemctl enable postgresql
      sudo systemctl start postgresql
      ;;
    yum|dnf)
      sudo "$pkg_mgr" install -y postgresql-server postgresql-contrib
      sudo postgresql-setup --initdb
      sudo systemctl enable postgresql
      sudo systemctl start postgresql
      ;;
    pacman)
      sudo pacman -S --noconfirm postgresql
      sudo systemctl enable postgresql
      sudo systemctl start postgresql
      ;;
    apk)
      sudo apk add --no-cache postgresql postgresql-client
      sudo rc-update add postgresql
      sudo service postgresql start
      ;;
    emerge)
      sudo emerge --ask=n dev-db/postgresql
      sudo systemctl enable postgresql
      sudo systemctl start postgresql
      ;;
    zypper)
      sudo zypper install -y postgresql postgresql-server
      sudo systemctl enable postgresql
      sudo systemctl start postgresql
      ;;
    snap)
      sudo snap install postgresql
      sudo systemctl enable snap.postgresql.postgresql
      sudo systemctl start snap.postgresql.postgresql
      ;;
    brew)
      brew install postgresql
      brew services start postgresql
      ;;
    *)
      warn "Cannot install PostgreSQL automatically on this system"
      return 1
      ;;
  esac
}

install_php() {
  local pkg_mgr="$1"
  
  case "$pkg_mgr" in
    apt)
      sudo apt-get update
      sudo apt-get install -y php php-cli php-fpm php-mysql php-curl php-gd php-mbstring php-xml php-zip
      ;;
    yum|dnf)
      sudo "$pkg_mgr" install -y php php-cli php-fpm php-mysqlnd php-curl php-gd php-mbstring php-xml php-zip
      ;;
    pacman)
      sudo pacman -S --noconfirm php php-fpm
      ;;
    brew)
      brew install php
      ;;
    *)
      warn "Cannot install PHP automatically on this system"
      return 1
      ;;
  esac
}

install_composer() {
  if command -v php &>/dev/null; then
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
    sudo chmod +x /usr/local/bin/composer
  else
    warn "PHP is required to install Composer"
    return 1
  fi
}

install_node() {
  local pkg_mgr="$1"
  
  case "$pkg_mgr" in
    apt)
      curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
      sudo apt-get install -y nodejs
      ;;
    yum|dnf)
      curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
      sudo "$pkg_mgr" install -y nodejs
      ;;
    pacman)
      sudo pacman -S --noconfirm nodejs npm
      ;;
    brew)
      brew install node
      ;;
    choco)
      choco install nodejs -y
      ;;
    winget)
      winget install OpenJS.NodeJS
      ;;
    *)
      warn "Cannot install Node.js automatically on this system"
      return 1
      ;;
  esac
}

install_python3() {
  local pkg_mgr="$1"
  
  case "$pkg_mgr" in
    apt)
      sudo apt-get update
      sudo apt-get install -y python3 python3-pip python3-venv
      ;;
    yum|dnf)
      sudo "$pkg_mgr" install -y python3 python3-pip
      ;;
    pacman)
      sudo pacman -S --noconfirm python python-pip
      ;;
    brew)
      brew install python
      ;;
    choco)
      choco install python -y
      ;;
    winget)
      winget install Python.Python.3
      ;;
    *)
      warn "Cannot install Python3 automatically on this system"
      return 1
      ;;
  esac
}

install_docker() {
  local pkg_mgr="$1"
  
  case "$pkg_mgr" in
    apt)
      # Install Docker using official script
      curl -fsSL https://get.docker.com -o get-docker.sh
      sudo sh get-docker.sh
      sudo usermod -aG docker "$(logname)"
      rm get-docker.sh
      ;;
    brew)
      brew install --cask docker
      ;;
    choco)
      choco install docker-desktop -y
      ;;
    winget)
      winget install Docker.DockerDesktop
      ;;
    *)
      warn "Cannot install Docker automatically on this system"
      return 1
      ;;
  esac
}

install_git() {
  local pkg_mgr="$1"
  
  case "$pkg_mgr" in
    apt)
      sudo apt-get update
      sudo apt-get install -y git
      ;;
    yum|dnf)
      sudo "$pkg_mgr" install -y git
      ;;
    pacman)
      sudo pacman -S --noconfirm git
      ;;
    brew)
      brew install git
      ;;
    choco)
      choco install git -y
      ;;
    winget)
      winget install Git.Git
      ;;
    *)
      warn "Cannot install Git automatically on this system"
      return 1
      ;;
  esac
}

install_curl() {
  local pkg_mgr="$1"
  
  case "$pkg_mgr" in
    apt)
      sudo apt-get update
      sudo apt-get install -y curl
      ;;
    yum|dnf)
      sudo "$pkg_mgr" install -y curl
      ;;
    pacman)
      sudo pacman -S --noconfirm curl
      ;;
    brew)
      brew install curl
      ;;
    choco)
      choco install curl -y
      ;;
    winget)
      winget install cURL.cURL
      ;;
    *)
      warn "Cannot install cURL automatically on this system"
      return 1
      ;;
  esac
}

# ----------------------
# Main Installation Function
# ----------------------
install_dependency() {
  local dep="$1"
  local pkg_mgr="$2"
  local platform="$3"
  
  case "$dep" in
    xampp) install_xampp "$platform" ;;
    apache) install_apache "$pkg_mgr" ;;
    mysql) install_mysql "$pkg_mgr" ;;
    postgresql) install_postgresql "$pkg_mgr" ;;
    php) install_php "$pkg_mgr" ;;
    composer) install_composer ;;
    node) install_node "$pkg_mgr" ;;
    python3) install_python3 "$pkg_mgr" ;;
    docker) install_docker "$pkg_mgr" ;;
    git) install_git "$pkg_mgr" ;;
    curl) install_curl "$pkg_mgr" ;;
    *)
      warn "Unknown dependency: $dep"
      return 1
      ;;
  esac
}

# ----------------------
# Dependency Check and Install
# ----------------------
check_and_install_dependencies() {
  local platform="$1"
  local pkg_mgr=$(detect_package_manager "$platform")
  local missing_deps=()
  local optional_deps=()
  
  log "Checking dependencies for $platform..."
  
  # Check for XAMPP first (recommended)
  if ! check_dependency "xampp"; then
    warn "XAMPP not found. XAMPP is recommended for easy setup."
    if confirm "Would you like to install XAMPP (includes Apache, MySQL, PHP)? This is the recommended option."; then
      if install_dependency "xampp" "$pkg_mgr" "$platform"; then
        ok "✓ XAMPP installed successfully"
        # XAMPP provides Apache, MySQL, and PHP
        return 0
      else
        err "Failed to install XAMPP. Falling back to system packages."
      fi
    else
      log "Proceeding with system package installation..."
    fi
  else
    ok "✓ XAMPP is installed"
    return 0
  fi
  
  # Check required dependencies (system packages)
  local required_deps=("apache" "php" "curl")
  for dep in "${required_deps[@]}"; do
    if ! check_dependency "$dep"; then
      missing_deps+=("$dep")
    else
      ok "✓ $dep is installed"
    fi
  done
  
  # Check optional dependencies
  local optional_list=("mysql" "composer" "node" "python3" "docker" "git")
  for dep in "${optional_list[@]}"; do
    if ! check_dependency "$dep"; then
      optional_deps+=("$dep")
    else
      ok "✓ $dep is installed"
    fi
  done
  
  # Handle missing required dependencies
  if [[ ${#missing_deps[@]} -gt 0 ]]; then
    err "Missing required dependencies: ${missing_deps[*]}"
    
    if [[ "$pkg_mgr" == "unknown" ]]; then
      err "Cannot detect package manager. Please install dependencies manually:"
      for dep in "${missing_deps[@]}"; do
        echo "  - ${DEPENDENCIES[$dep]}"
      done
      return 1
    fi
    
    if confirm "Would you like to install missing dependencies automatically?"; then
      for dep in "${missing_deps[@]}"; do
        log "Installing $dep..."
        if install_dependency "$dep" "$pkg_mgr"; then
          ok "✓ $dep installed successfully"
        else
          err "✗ Failed to install $dep"
        fi
      done
    else
      warn "Please install the following dependencies manually:"
      for dep in "${missing_deps[@]}"; do
        echo "  - ${DEPENDENCIES[$dep]}"
      done
      return 1
    fi
  fi
  
  # Handle optional dependencies
  if [[ ${#optional_deps[@]} -gt 0 ]]; then
    warn "Optional dependencies not found: ${optional_deps[*]}"
    echo "These will limit framework support:"
    for dep in "${optional_deps[@]}"; do
      case "$dep" in
        mysql) echo "  - Database management features" ;;
        composer) echo "  - Laravel and PHP framework support" ;;
        node) echo "  - React, Vue, Angular, Next.js support" ;;
        python3) echo "  - Django and Flask support" ;;
        docker) echo "  - Multi-service projects" ;;
        git) echo "  - Version control integration" ;;
      esac
    done
    
    if confirm "Would you like to install optional dependencies?"; then
      for dep in "${optional_deps[@]}"; do
        log "Installing $dep..."
        if install_dependency "$dep" "$pkg_mgr"; then
          ok "✓ $dep installed successfully"
        else
          warn "✗ Failed to install $dep (optional)"
        fi
      done
    fi
  fi
  
  ok "Dependency check complete!"
}

# ----------------------
# Interactive Dependency Installation
# ----------------------
install_dependency_interactive() {
  local dep="$1"
  local platform="$2"
  local pkg_mgr=$(detect_package_manager "$platform")
  
  if [[ "$pkg_mgr" == "unknown" ]]; then
    warn "Cannot detect package manager for automatic installation"
    show_installation_recommendations "$platform"
    return 1
  fi
  
  log "Installing $dep..."
  if install_dependency "$dep" "$pkg_mgr"; then
    ok "✓ $dep installed successfully"
    return 0
  else
    err "✗ Failed to install $dep"
    return 1
  fi
}

# ----------------------
# Framework Requirements Check with Auto-Install
# ----------------------
check_framework_requirements() {
  local framework="$1"
  local platform=$(detect_platform)
  local missing_deps=()
  
  case "$framework" in
    laravel)
      if ! check_dependency "composer"; then
        missing_deps+=("composer")
      fi
      if ! check_dependency "php"; then
        missing_deps+=("php")
      fi
      ;;
    react|vue|angular|nextjs|express)
      if ! check_dependency "node"; then
        missing_deps+=("node")
      fi
      ;;
    django|flask)
      if ! check_dependency "python3"; then
        missing_deps+=("python3")
      fi
      ;;
    wordpress)
      if ! check_dependency "php"; then
        missing_deps+=("php")
      fi
      ;;
  esac
  
  if [[ ${#missing_deps[@]} -gt 0 ]]; then
    err "Missing dependencies for $framework: ${missing_deps[*]}"
    
    if confirm "Would you like to install the missing dependencies automatically?"; then
      local success=true
      for dep in "${missing_deps[@]}"; do
        if ! install_dependency_interactive "$dep" "$platform"; then
          success=false
        fi
      done
      
      if [[ "$success" == "true" ]]; then
        ok "All dependencies installed successfully!"
        return 0
      else
        err "Some dependencies failed to install"
        show_installation_recommendations "$platform"
        return 1
      fi
    else
      warn "Please install the following dependencies manually:"
      for dep in "${missing_deps[@]}"; do
        echo "  - ${DEPENDENCIES[$dep]}"
      done
      show_installation_recommendations "$platform"
      return 1
    fi
  fi
  
  return 0
}

# ----------------------
# Smart Dependency Suggestions
# ----------------------
suggest_dependencies_for_action() {
  local action="$1"
  local platform="$2"
  
  case "$action" in
    "create_laravel")
      echo "To create Laravel projects, you need:"
      echo "  🎯 RECOMMENDED: XAMPP (includes Apache, MySQL, PHP)"
      echo "  - Composer (for Laravel installation)"
      echo "  - Or install system packages: PHP, MySQL, Apache"
      ;;
    "create_react"|"create_vue"|"create_angular"|"create_nextjs")
      echo "To create $action projects, you need:"
      echo "  - Node.js (for JavaScript runtime)"
      echo "  - npm (comes with Node.js)"
      echo "  - XAMPP (optional, for full-stack development)"
      ;;
    "create_django"|"create_flask")
      echo "To create $action projects, you need:"
      echo "  - Python3 (for Python runtime)"
      echo "  - pip (for package management)"
      echo "  - XAMPP (optional, for database support)"
      ;;
    "create_wordpress")
      echo "To create WordPress projects, you need:"
      echo "  🎯 RECOMMENDED: XAMPP (includes Apache, MySQL, PHP)"
      echo "  - Or install system packages: PHP, MySQL, Apache"
      ;;
    "docker_projects")
      echo "To use Docker Compose projects, you need:"
      echo "  - Docker (for containerization)"
      echo "  - Docker Compose (for multi-service projects)"
      echo "  - XAMPP (optional, for database services)"
      ;;
    "database_management")
      echo "To use database management features, you need:"
      echo "  🎯 RECOMMENDED: XAMPP (includes MySQL)"
      echo "  - Or install system MySQL"
      ;;
  esac
  
  echo
  show_installation_recommendations "$platform"
}

# ----------------------
# Installation Recommendations
# ----------------------
show_installation_recommendations() {
  local platform="$1"
  
  log "Installation Recommendations for $platform:"
  echo
  
  # Always recommend XAMPP first
  echo "🎯 RECOMMENDED: Install XAMPP (includes Apache, MySQL, PHP)"
  echo "  Download from: https://www.apachefriends.org/"
  echo "  XAMPP provides everything you need for web development"
  echo
  
  case "$platform" in
    linux)
      echo "Alternative - System packages:"
      echo "For Ubuntu/Debian:"
      echo "  sudo apt update && sudo apt install -y apache2 mysql-server php composer nodejs python3 docker.io git curl"
      echo
      echo "For CentOS/RHEL/Fedora:"
      echo "  sudo dnf install -y httpd mysql-server php composer nodejs python3 docker git curl"
      echo
      echo "For Arch Linux:"
      echo "  sudo pacman -S apache mysql php composer nodejs python docker git curl"
      ;;
    macos)
      echo "Alternative - System packages:"
      echo "Using Homebrew:"
      echo "  brew install httpd mysql php composer node python docker git curl"
      ;;
    windows)
      echo "Alternative - System packages:"
      echo "Using Chocolatey:"
      echo "  choco install apache-httpd mysql php composer nodejs python docker-desktop git curl"
      echo
      echo "Using Winget:"
      echo "  winget install Apache.ApacheHTTPD MySQL.MySQL OpenJS.NodeJS Python.Python.3 Docker.DockerDesktop Git.Git cURL.cURL"
      ;;
  esac
}
