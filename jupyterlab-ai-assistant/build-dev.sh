#!/bin/bash
set -e  # Exit on error

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================================${NC}"
echo -e "${BLUE}       JupyterLab AI Assistant - Enhanced Installation              ${NC}"
echo -e "${BLUE}====================================================================${NC}"

# Function to check if a command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed. Please install it and try again.${NC}"
        exit 1
    fi
}

# Check required commands
check_command python3
check_command pip

# Create and activate virtual environment if it doesn't exist
echo -e "\n${YELLOW}Step 1: Setting up virtual environment...${NC}"
if [ ! -d "dev-venv" ]; then
    echo -e "Creating virtual environment..."
    python3 -m venv dev-venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "Virtual environment already exists."
fi

echo -e "Activating virtual environment..."
source dev-venv/bin/activate
echo -e "${GREEN}✓ Virtual environment activated${NC}"

# Clean previous installation
echo -e "\n${YELLOW}Step 2: Removing previous installations...${NC}"
pip uninstall -y jupyterlab-ai-assistant || true
jupyter labextension uninstall jupyterlab-ai-assistant 2>/dev/null || true
echo -e "${GREEN}✓ Previous installations removed${NC}"

# Clean JupyterLab caches and config
echo -e "\n${YELLOW}Step 3: Cleaning JupyterLab caches and config...${NC}"
jupyter lab clean --all || true
rm -rf ~/.jupyter/lab/workspaces/* || true
echo -e "${GREEN}✓ JupyterLab caches cleaned${NC}"

# Backup and fix configuration files to avoid conflicts
echo -e "\n${YELLOW}Step 4: Fixing configuration...${NC}"
if [ -f ~/.jupyter/jupyter_server_config.json ]; then
    mv ~/.jupyter/jupyter_server_config.json ~/.jupyter/jupyter_server_config.json.bak
    echo -e "${GREEN}✓ Backed up jupyter_server_config.json${NC}"
fi

# Install JupyterLab and dependencies
echo -e "\n${YELLOW}Step 5: Installing JupyterLab and dependencies...${NC}"
pip install --upgrade pip setuptools wheel build 
pip install "jupyterlab>=4.0.0,<5.0.0" "jupyter_server>=2.0.0,<3.0.0" "jupyter-client>=8.0.0"
pip install hatchling hatch-nodejs-version hatch-jupyter-builder
pip install aiohttp "requests>=2.25.0"
echo -e "${GREEN}✓ JupyterLab and dependencies installed${NC}"

# Clean npm cache and install dependencies
echo -e "\n${YELLOW}Step 6: Setting up frontend dependencies...${NC}"
# Use 'npm install' instead of 'npm ci' when package-lock.json doesn't exist
echo -e "Installing Node.js dependencies..."
if [ -f "package-lock.json" ]; then
    echo -e "Found package-lock.json, using npm ci for clean install..."
    npm ci
else
    echo -e "No package-lock.json found, using npm install to generate it..."
    npm install
fi
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Build the extension
echo -e "\n${YELLOW}Step 7: Building the extension...${NC}"
npm run build
pip install -e .
echo -e "${GREEN}✓ Extension built successfully${NC}"

# Enable the server extension explicitly
echo -e "\n${YELLOW}Step 8: Enabling server extension...${NC}"
jupyter server extension enable jupyterlab_ai_assistant
jupyter server extension list | grep jupyterlab_ai_assistant
echo -e "${GREEN}✓ Server extension enabled${NC}"

# Validate successful installation
echo -e "\n${YELLOW}Step 9: Verifying installation...${NC}"
jupyter labextension list | grep jupyterlab-ai-assistant
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Extension successfully installed!${NC}"
else
    echo -e "${RED}× Extension installation verification failed${NC}"
    exit 1
fi

echo -e "\n${BLUE}====================================================================${NC}"
echo -e "${GREEN}Installation completed successfully!${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo 
echo -e "To start JupyterLab with debugging:"
echo -e "${YELLOW}jupyter lab --debug${NC}"
echo
echo -e "If you experience any issues, check the troubleshooting section in README.md"
echo -e "${BLUE}====================================================================${NC}" 