#!/bin/bash
set -e  # Exit on error

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================================${NC}"
echo -e "${BLUE}       JupyterLab AI Assistant - Build Distribution Files           ${NC}"
echo -e "${BLUE}====================================================================${NC}"

# Function to check if a command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed. Please install it and try again.${NC}"
        exit 1
    fi
}

# Check required commands
check_command npm
check_command python3
check_command pip

# Create and activate virtual environment if it doesn't exist
echo -e "\n${YELLOW}Step 1: Setting up virtual environment...${NC}"
if [ ! -d "dist-venv" ]; then
    echo -e "Creating virtual environment..."
    python3 -m venv dist-venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "Virtual environment already exists."
fi

echo -e "Activating virtual environment..."
source dist-venv/bin/activate
echo -e "${GREEN}✓ Virtual environment activated${NC}"

# Clean previous build artifacts
echo -e "\n${YELLOW}Step 2: Cleaning previous build artifacts...${NC}"
rm -rf dist/
rm -rf jupyterlab_ai_assistant/labextension/
rm -rf jupyterlab_ai_assistant/*.egg-info/
rm -rf build/
rm -rf lib/
# Don't remove node_modules to avoid constant reinstalls
rm -f tsconfig.tsbuildinfo
echo -e "${GREEN}✓ Cleanup completed${NC}"

# Install dependencies
echo -e "\n${YELLOW}Step 3: Installing build dependencies...${NC}"
pip install --upgrade pip setuptools wheel build hatchling hatch-nodejs-version hatch-jupyter-builder
pip install "jupyterlab>=4.0.0,<5.0.0" "jupyter_server>=2.0.0,<3.0.0" "jupyter-client>=8.0.0"
pip install aiohttp "requests>=2.25.0"

# Use 'npm install' instead of 'npm ci' when package-lock.json doesn't exist
echo -e "Installing Node.js dependencies..."
if [ -f "package-lock.json" ]; then
    echo -e "Found package-lock.json, using npm ci for clean install..."
    npm ci
else
    echo -e "No package-lock.json found, using npm install to generate it..."
    npm install
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Build frontend
echo -e "\n${YELLOW}Step 4: Building frontend components...${NC}"
npm run clean
npm run build:lib
npm run build:labextension
echo -e "${GREEN}✓ Frontend build completed${NC}"

# Build Python package
echo -e "\n${YELLOW}Step 5: Building Python distribution packages...${NC}"
python -m build --sdist --wheel .
echo -e "${GREEN}✓ Python distribution packages created${NC}"

# Verify build results
echo -e "\n${YELLOW}Step 6: Verifying build results...${NC}"
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    echo -e "${GREEN}✓ Distribution files successfully created in 'dist/' directory:${NC}"
    ls -lh dist/
else
    echo -e "${RED}× Build process did not produce distribution files as expected${NC}"
    exit 1
fi

# Check labextension
if [ -d "jupyterlab_ai_assistant/labextension" ]; then
    echo -e "${GREEN}✓ Lab extension assets successfully created${NC}"
else
    echo -e "${RED}× Lab extension assets were not created${NC}"
    exit 1
fi

echo -e "\n${BLUE}====================================================================${NC}"
echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo 
echo -e "You can install the wheel package with:"
echo -e "${YELLOW}pip install dist/*.whl${NC}"
echo
echo -e "Or publish to PyPI with:"
echo -e "${YELLOW}python -m twine upload dist/*${NC}"
echo -e "${BLUE}====================================================================${NC}" 