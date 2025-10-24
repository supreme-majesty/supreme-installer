#!/bin/bash

# TLD Management Module
# Handles Top Level Domain configuration and management

MODULE_NAME="TLD Management"
MODULE_VERSION="1.0.0"
MODULE_DESCRIPTION="Top Level Domain configuration and management system"

# TLD Configuration
TLD_CONFIG_FILE="$SUPREME_ROOT/tld.conf"

# Initialize TLD module
init_tld() {
    echo "Initializing TLD Management module..."
    
    # Create TLD config file if it doesn't exist
    if [[ ! -f "$TLD_CONFIG_FILE" ]]; then
        create_default_tld_config
    fi
    
    echo "TLD Management module initialized"
}

# Create default TLD configuration
create_default_tld_config() {
    cat > "$TLD_CONFIG_FILE" << EOF
# TLD Management Configuration
# Default TLD settings for different environments

# Development TLDs
DEV_TLDS=".local .dev .test"

# Production TLDs  
PROD_TLDS=".com .org .net .io"

# Custom TLDs
CUSTOM_TLDS=""

# Default TLD for new projects
DEFAULT_TLD=".local"

# TLD validation settings
VALIDATE_TLD=true
CHECK_DOMAIN_AVAILABILITY=false

# SSL certificate TLD
SSL_TLD=".local"

# Cloud sync TLD
SYNC_TLD=".com"
EOF
}

# Get available TLDs
get_available_tlds() {
    local category="$1"
    
    case "$category" in
        "dev")
            echo ".local .dev .test .localhost"
            ;;
        "prod")
            echo ".com .org .net .io .co .me"
            ;;
        "all")
            echo ".local .dev .test .localhost .com .org .net .io .co .me"
            ;;
        *)
            echo ".local .dev .com .org"
            ;;
    esac
}

# Validate TLD format
validate_tld() {
    local tld="$1"
    
    # Check if TLD starts with dot
    if [[ ! "$tld" =~ ^\..+ ]]; then
        echo "Error: TLD must start with a dot (e.g., .com)"
        return 1
    fi
    
    # Check TLD length (2-63 characters)
    if [[ ${#tld} -lt 2 || ${#tld} -gt 63 ]]; then
        echo "Error: TLD must be between 2-63 characters"
        return 1
    fi
    
    # Check for valid characters (alphanumeric and hyphens)
    if [[ ! "$tld" =~ ^\.[a-zA-Z0-9-]+$ ]]; then
        echo "Error: TLD contains invalid characters"
        return 1
    fi
    
    echo "TLD validation passed: $tld"
    return 0
}

# Set default TLD
set_default_tld() {
    local tld="$1"
    
    if validate_tld "$tld"; then
        # Update config file
        sed -i "s/DEFAULT_TLD=.*/DEFAULT_TLD=\"$tld\"/" "$TLD_CONFIG_FILE"
        echo "Default TLD set to: $tld"
    else
        echo "Failed to set default TLD"
        return 1
    fi
}

# Get current TLD configuration
get_tld_config() {
    if [[ -f "$TLD_CONFIG_FILE" ]]; then
        cat "$TLD_CONFIG_FILE"
    else
        echo "TLD configuration file not found"
        return 1
    fi
}

# Add custom TLD
add_custom_tld() {
    local tld="$1"
    
    if validate_tld "$tld"; then
        # Add to custom TLDs in config
        local current_custom=$(grep "CUSTOM_TLDS=" "$TLD_CONFIG_FILE" | cut -d'"' -f2)
        if [[ -z "$current_custom" ]]; then
            sed -i "s/CUSTOM_TLDS=\"\"/CUSTOM_TLDS=\"$tld\"/" "$TLD_CONFIG_FILE"
        else
            sed -i "s/CUSTOM_TLDS=\"$current_custom\"/CUSTOM_TLDS=\"$current_custom $tld\"/" "$TLD_CONFIG_FILE"
        fi
        echo "Custom TLD added: $tld"
    else
        echo "Failed to add custom TLD"
        return 1
    fi
}

# Remove custom TLD
remove_custom_tld() {
    local tld="$1"
    
    local current_custom=$(grep "CUSTOM_TLDS=" "$TLD_CONFIG_FILE" | cut -d'"' -f2)
    local new_custom=$(echo "$current_custom" | sed "s/$tld//g" | sed 's/  */ /g' | sed 's/^ *//' | sed 's/ *$//')
    
    sed -i "s/CUSTOM_TLDS=\"$current_custom\"/CUSTOM_TLDS=\"$new_custom\"/" "$TLD_CONFIG_FILE"
    echo "Custom TLD removed: $tld"
}

# Check domain availability (if whois is available)
check_domain_availability() {
    local domain="$1"
    
    if command -v whois &> /dev/null; then
        if whois "$domain" | grep -q "No match"; then
            echo "Domain $domain is available"
            return 0
        else
            echo "Domain $domain is not available"
            return 1
        fi
    else
        echo "whois command not available, cannot check domain availability"
        return 2
    fi
}

# Generate domain suggestions
generate_domain_suggestions() {
    local base_name="$1"
    local tld="$2"
    
    echo "Domain suggestions for $base_name:"
    echo "- $base_name$tld"
    echo "- $base_name-dev$tld"
    echo "- $base_name-test$tld"
    echo "- $base_name-app$tld"
    echo "- $base_name-api$tld"
}

# TLD module health check
check_tld_health() {
    local status="healthy"
    local issues=()
    
    # Check if config file exists
    if [[ ! -f "$TLD_CONFIG_FILE" ]]; then
        status="error"
        issues+=("TLD config file missing")
    fi
    
    # Check if config file is readable
    if [[ ! -r "$TLD_CONFIG_FILE" ]]; then
        status="error"
        issues+=("TLD config file not readable")
    fi
    
    # Check if whois is available for domain checking
    if ! command -v whois &> /dev/null; then
        issues+=("whois command not available")
    fi
    
    echo "TLD module status: $status"
    if [[ ${#issues[@]} -gt 0 ]]; then
        echo "Issues found:"
        for issue in "${issues[@]}"; do
            echo "  - $issue"
        done
    fi
    
    return 0
}

# Main TLD module function
tld_module() {
    local action="$1"
    shift
    
    case "$action" in
        "init")
            init_tld
            ;;
        "validate")
            validate_tld "$1"
            ;;
        "set-default")
            set_default_tld "$1"
            ;;
        "get-config")
            get_tld_config
            ;;
        "add-custom")
            add_custom_tld "$1"
            ;;
        "remove-custom")
            remove_custom_tld "$1"
            ;;
        "check-domain")
            check_domain_availability "$1"
            ;;
        "suggest")
            generate_domain_suggestions "$1" "$2"
            ;;
        "health")
            check_tld_health
            ;;
        "list")
            get_available_tlds "$1"
            ;;
        *)
            echo "TLD Management Module"
            echo "Available actions: init, validate, set-default, get-config, add-custom, remove-custom, check-domain, suggest, health, list"
            ;;
    esac
}

# Export functions
export -f tld_module init_tld validate_tld set_default_tld get_tld_config
export -f add_custom_tld remove_custom_tld check_domain_availability
export -f generate_domain_suggestions check_tld_health get_available_tlds

# Run module if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    tld_module "$@"
fi
