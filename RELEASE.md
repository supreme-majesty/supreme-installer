# Supreme Development Environment - Release Guide

## Overview

This guide explains how to create and manage releases for Supreme Development Environment, including automated builds for Linux (.deb), Windows (.exe), and macOS (.dmg) packages.

## Release Process

### 1. Automated Releases (Recommended)

#### Using GitHub Actions
1. **Create a new tag:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **GitHub Actions will automatically:**
   - Build packages for all platforms
   - Create a GitHub release
   - Upload installers to the release

#### Using the Release Script
```bash
# Run the release script
./scripts/release.sh

# Follow the prompts:
# - Enter new version (e.g., 1.1.0)
# - Confirm push to remote
# - GitHub Actions will handle the rest
```

### 2. Manual Releases

#### Prerequisites
- **Linux**: `build-essential`, `devscripts`, `debhelper`
- **Windows**: `chocolatey`, `nsis`
- **macOS**: `hdiutil` (built-in)

#### Build Commands

**Linux (.deb package):**
```bash
# Install dependencies
sudo apt update
sudo apt install -y build-essential devscripts debhelper

# Create package structure
mkdir -p supreme-deb/DEBIAN
mkdir -p supreme-deb/usr/local/bin
mkdir -p supreme-deb/usr/local/share/supreme

# Copy files
cp supreme-installer.sh supreme-deb/usr/local/bin/supreme-installer
cp -r supreme/* supreme-deb/usr/local/share/supreme/

# Create control file
cat > supreme-deb/DEBIAN/control << EOF
Package: supreme-dev
Version: 1.0.0
Section: devel
Priority: optional
Architecture: amd64
Depends: curl, wget
Maintainer: Supreme Development Team
Description: Supreme Development Environment
EOF

# Build package
dpkg-deb --build supreme-deb supreme-dev_1.0.0_amd64.deb
```

**Windows (.exe installer):**
```bash
# Install NSIS
choco install nsis -y

# Create installer script (see .github/workflows/release.yml)
# Compile installer
makensis supreme-installer.nsi
```

**macOS (.dmg package):**
```bash
# Create DMG structure
mkdir -p Supreme.app/Contents/MacOS
mkdir -p Supreme.app/Contents/Resources

# Copy files and create launcher
# Build DMG
hdiutil create -volname "Supreme Development Environment" \
  -srcfolder Supreme.app -ov -format UDZO supreme-dev-1.0.0-macos.dmg
```

## Package Contents

### Linux (.deb)
- **Binary**: `/usr/local/bin/supreme-installer`
- **Files**: `/usr/local/share/supreme/`
- **Config**: `/etc/supreme/`
- **Dependencies**: `curl`, `wget`

### Windows (.exe)
- **Installation**: `C:\Program Files\Supreme\`
- **Shortcuts**: Start Menu → Supreme
- **PATH**: Automatically added to system PATH
- **Uninstaller**: Included

### macOS (.dmg)
- **Application**: `Supreme.app`
- **Location**: Applications folder
- **Launcher**: Double-click to run installer

## Version Management

### Version File Structure
```bash
# supreme/version
SUPREME_VERSION=1.0.0
BUILD_DATE=2024-01-15T10:30:00Z
GIT_COMMIT=abc123def456
```

### Version Functions
```bash
# Get current version
supreme version

# Show build information
supreme info
```

## Release Checklist

### Before Release
- [ ] Update version numbers
- [ ] Test on all platforms
- [ ] Update documentation
- [ ] Check dependencies
- [ ] Verify installation scripts

### During Release
- [ ] Create git tag
- [ ] Push to repository
- [ ] Monitor GitHub Actions
- [ ] Verify package builds
- [ ] Test installers

### After Release
- [ ] Update download links
- [ ] Announce release
- [ ] Monitor for issues
- [ ] Plan next release

## GitHub Actions Workflow

### Triggers
- **Tag push**: `v*` (e.g., `v1.0.0`)
- **Manual**: Workflow dispatch with version input

### Build Matrix
- **Ubuntu**: Linux .deb package
- **Windows**: Windows .exe installer
- **macOS**: macOS .dmg package

### Artifacts
- `supreme-dev_1.0.0_amd64.deb`
- `supreme-dev-1.0.0-windows.exe`
- `supreme-dev-1.0.0-macos.dmg`

## Installation Instructions

### Linux (Debian/Ubuntu)
```bash
# Download .deb package
wget https://github.com/username/supreme/releases/download/v1.0.0/supreme-dev_1.0.0_amd64.deb

# Install package
sudo dpkg -i supreme-dev_1.0.0_amd64.deb

# Fix dependencies if needed
sudo apt-get install -f

# Run installer
supreme-installer
```

### Windows
1. Download `supreme-dev-1.0.0-windows.exe`
2. Run as Administrator
3. Follow installation wizard
4. Run `supreme-installer` from Start Menu

### macOS
1. Download `supreme-dev-1.0.0-macos.dmg`
2. Mount DMG and drag to Applications
3. Run Supreme from Applications
4. Follow setup wizard

## Troubleshooting

### Build Issues
- **Linux**: Check `build-essential` and `devscripts` packages
- **Windows**: Verify NSIS installation and Chocolatey
- **macOS**: Ensure Xcode command line tools installed

### Package Issues
- **Dependencies**: Check package dependencies
- **Permissions**: Verify file permissions
- **Paths**: Check installation paths

### Release Issues
- **GitHub Actions**: Check workflow logs
- **Tags**: Verify tag format and push
- **Permissions**: Check repository permissions

## Best Practices

### Versioning
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Increment MAJOR for breaking changes
- Increment MINOR for new features
- Increment PATCH for bug fixes

### Testing
- Test on clean systems
- Verify all dependencies
- Check installation paths
- Test uninstallation

### Documentation
- Update README for new features
- Document breaking changes
- Provide migration guides
- Include troubleshooting tips

## Support

For release-related issues:
- **GitHub Issues**: Report build problems
- **Discussions**: Ask questions about releases
- **Documentation**: Check installation guides
- **Community**: Join discussions for help
