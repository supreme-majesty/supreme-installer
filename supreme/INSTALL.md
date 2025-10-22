# Supreme Development Environment - Installation Guide

## Prerequisites

Supreme automatically detects and installs dependencies, but here's what you need to know:

### 🎯 **RECOMMENDED: XAMPP Installation**
- **XAMPP** - Complete LAMP stack (Apache + MySQL + PHP) in one package
- **Easy Setup** - One download provides everything you need
- **Cross-Platform** - Works on Linux, macOS, and Windows
- **No Configuration** - Ready to use out of the box

### Alternative: System Packages
- **Apache** (or XAMPP) - Web server
- **PHP** - Runtime for PHP projects  
- **MySQL** - Database server
- **cURL** - For downloading packages

### Optional Dependencies (for framework support)
- **Composer** - PHP dependency manager (for Laravel)
- **Node.js** - JavaScript runtime (for React, Vue, Angular, Next.js)
- **Python3** - Python runtime (for Django, Flask)
- **Docker** - Container platform (for multi-service projects)
- **Git** - Version control

## Installation Methods

### 1. Automatic Installation (Recommended)

```bash
# Download and run the installer
sudo ./supreme-installer.sh
```

The installer will:
- **Detect your platform** (Linux, macOS, Windows)
- **Recommend XAMPP installation** (includes Apache, MySQL, PHP)
- **Offer to install XAMPP automatically** or use system packages
- **Configure Apache and SSL certificates**
- **Install the Supreme CLI**

### 2. XAMPP Installation (Recommended)

**Download XAMPP from:** https://www.apachefriends.org/

- **Linux**: Download `.run` installer
- **macOS**: Download `.dmg` installer  
- **Windows**: Download `.exe` installer

After installing XAMPP, run:
```bash
sudo ./supreme-installer.sh
```

### 3. Manual Dependency Installation

If you prefer system packages over XAMPP:

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install -y apache2 mysql-server php composer nodejs python3 docker.io git curl
```

#### CentOS/RHEL/Fedora
```bash
sudo dnf install -y httpd mysql-server php composer nodejs python3 docker git curl
```

#### Arch Linux
```bash
sudo pacman -S apache mysql php composer nodejs python docker git curl
```

#### macOS (with Homebrew)
```bash
brew install httpd mysql php composer node python docker git curl
```

#### Windows (with Chocolatey)
```bash
choco install apache-httpd mysql php composer nodejs python docker-desktop git curl
```

#### Windows (with Winget)
```bash
winget install Apache.ApacheHTTPD MySQL.MySQL OpenJS.NodeJS Python.Python.3 Docker.DockerDesktop Git.Git cURL.cURL
```

### 3. XAMPP Installation (Alternative)

For a simpler setup, install XAMPP which includes Apache, MySQL, and PHP:

- **Linux**: Download from [Apache Friends](https://www.apachefriends.org/)
- **macOS**: Download from [Apache Friends](https://www.apachefriends.org/)
- **Windows**: Download from [Apache Friends](https://www.apachefriends.org/)

Then run the Supreme installer - it will detect XAMPP automatically.

## Post-Installation

### Check Installation
```bash
supreme doctor
```

### Check Dependencies
```bash
supreme deps
```

### Create Your First Project
```bash
# Basic project
supreme new myproject

# Framework-specific project
supreme create laravel myapp
supreme create react myfrontend
supreme create django myapi
```

## Troubleshooting

### Missing Dependencies

If you get dependency errors:

1. **Check what's missing:**
   ```bash
   supreme deps
   ```

2. **Install manually:**
   ```bash
   # Example: Install Node.js on Ubuntu
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

3. **Re-run dependency check:**
   ```bash
   supreme deps
   ```

### Apache Issues

If Apache isn't detected:

1. **Check if Apache is running:**
   ```bash
   sudo systemctl status apache2  # Ubuntu/Debian
   sudo systemctl status httpd    # CentOS/RHEL
   ```

2. **Start Apache:**
   ```bash
   sudo systemctl start apache2
   sudo systemctl enable apache2
   ```

### Permission Issues

If you get permission errors:

1. **Add user to appropriate groups:**
   ```bash
   sudo usermod -aG www-data $USER  # Ubuntu/Debian
   sudo usermod -aG apache $USER     # CentOS/RHEL
   ```

2. **Log out and back in** to apply group changes

### Framework-Specific Issues

#### Laravel Projects
- Ensure Composer is installed: `composer --version`
- Install Composer: `curl -sS https://getcomposer.org/installer | php`

#### React/Vue/Angular Projects
- Ensure Node.js is installed: `node --version`
- Install Node.js: Use the official installer or package manager

#### Django/Flask Projects
- Ensure Python3 is installed: `python3 --version`
- Install Python3: Use your system's package manager

## Platform-Specific Notes

### Linux
- Works with most distributions (Ubuntu, Debian, CentOS, RHEL, Fedora, Arch)
- Automatically detects package managers (apt, yum, dnf, pacman)
- Supports both system Apache and XAMPP

### macOS
- Requires Homebrew for automatic dependency installation
- Supports system Apache and XAMPP
- May need to configure Apache paths manually

### Windows
- Supports WSL (Windows Subsystem for Linux)
- Works with Chocolatey and Winget package managers
- Supports XAMPP installation

## Uninstallation

To remove Supreme:

```bash
supreme uninstall
```

This removes:
- Supreme CLI (`/usr/local/bin/supreme`)
- Configuration files (`/etc/supreme`, `~/.supreme`)
- Apache includes

**Note**: This does NOT remove your projects or system dependencies.

## Getting Help

If you encounter issues:

1. **Check the logs:**
   ```bash
   supreme doctor
   ```

2. **Verify dependencies:**
   ```bash
   supreme deps
   ```

3. **Check project status:**
   ```bash
   supreme status <project-name>
   ```

4. **View configuration:**
   ```bash
   supreme info
   ```
