#!/bin/bash
# =============================================================================
# upload_to_pypi.sh
# =============================================================================
# 
# DESCRIPTION:
#   This script uploads Python distribution packages to the main PyPI repository securely.
#   It handles credential management through environment variables and performs
#   necessary checks before upload. This approach avoids hardcoding credentials
#   in the script, making it safe for version control systems.
#
# USAGE:
#   ./upload_to_pypi.sh [dist_directory]
#
# ARGUMENTS:
#   dist_directory - Optional. Path to directory containing distribution files
#                   (.whl and .tar.gz). Defaults to "../jupyterlab-ai-assistant/dist"
#
# ENVIRONMENT VARIABLES:
#   PYPI_USERNAME - Your PyPI username
#   PYPI_PASSWORD - Your PyPI password or token
#
# EXAMPLES:
#   # Upload using default dist directory
#   ./upload_to_pypi.sh
#
#   # Upload from a specific directory
#   ./upload_to_pypi.sh /path/to/dist/files
#
# NOTES:
#   - Requires Python 3
#   - Uses upload_to_pypi.py script to handle the actual upload
#   - Environment variables are unset after execution for security
#   - THIS UPLOADS TO THE MAIN PYPI REPOSITORY (not the test one)
# =============================================================================

set -e  # Exit on first error

# ANSI color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}============================================${NC}"
echo -e "${PURPLE}   PRODUCTION PyPI Distribution Upload      ${NC}"
echo -e "${PURPLE}============================================${NC}"
echo -e "${YELLOW}WARNING: This uploads to the MAIN PyPI repository!${NC}"
echo -e "${YELLOW}Packages will be publicly available to all Python users.${NC}"
echo -e "${PURPLE}============================================${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Check for Python 3 installation
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed or not in PATH${NC}"
    exit 1
fi

# Default dist directory (relative to project root)
DIST_DIR="../jupyterlab-ai-assistant/dist"

# Allow custom dist directory as argument
if [ -n "$1" ]; then
    DIST_DIR="$1"
fi

# Verify the dist directory exists
if [ ! -d "$DIST_DIR" ]; then
    echo -e "${RED}Error: Distribution directory '$DIST_DIR' not found!${NC}"
    exit 1
fi

echo -e "${YELLOW}Using distribution directory: ${NC}$DIST_DIR"

# Locate the Python upload script
PYTHON_SCRIPT="$SCRIPT_DIR/upload_to_pypi.py"
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo -e "${RED}Error: upload_to_pypi.py script not found at $PYTHON_SCRIPT!${NC}"
    exit 1
fi

# Prompt for credentials if not set in environment variables
if [ -z "$PYPI_USERNAME" ]; then
    echo -e "${YELLOW}PyPI Username not found in environment.${NC}"
    echo -n "Enter your PyPI username: "
    read -r USERNAME
    export PYPI_USERNAME="$USERNAME"
fi

if [ -z "$PYPI_PASSWORD" ]; then
    echo -e "${YELLOW}PyPI Password/Token not found in environment.${NC}"
    echo -n "Enter your PyPI password or token: "
    read -rs PASSWORD
    echo # New line after password input
    export PYPI_PASSWORD="$PASSWORD"
fi

echo -e "${GREEN}Credentials set. Preparing for PyPI upload...${NC}"

# Execute the Python upload script
python3 "$PYTHON_SCRIPT" "$DIST_DIR"
RESULT=$?

# Display result message based on exit code
if [ $RESULT -eq 0 ]; then
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}Upload completed successfully!${NC}"
    echo -e "${GREEN}Your package is now available on PyPI!${NC}"
    echo -e "${GREEN}============================================${NC}"
else
    echo -e "${RED}============================================${NC}"
    echo -e "${RED}Upload failed!${NC}"
    echo -e "${RED}============================================${NC}"
fi

# Remove credentials from environment variables for security
unset PYPI_USERNAME
unset PYPI_PASSWORD

exit $RESULT 