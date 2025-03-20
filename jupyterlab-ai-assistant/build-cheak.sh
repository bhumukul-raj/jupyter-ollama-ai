#!/bin/bash
set -e  # Exit on error

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================================${NC}"
echo -e "${BLUE}       JupyterLab AI Assistant - Test PyPI Installation             ${NC}"
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
if [ ! -d "cheak-venv" ]; then
    echo -e "Creating virtual environment..."
    python3 -m venv cheak-venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "Virtual environment already exists."
fi

echo -e "Activating virtual environment..."
source cheak-venv/bin/activate
echo -e "${GREEN}✓ Virtual environment activated${NC}"

# Clean previous installation
echo -e "\n${YELLOW}Step 2: Removing previous installations...${NC}"
pip uninstall -y jupyterlab-ai-assistant || true
jupyter labextension uninstall jupyterlab-ai-assistant 2>/dev/null || true
echo -e "${GREEN}✓ Previous installations removed${NC}"

# Install JupyterLab and dependencies
echo -e "\n${YELLOW}Step 3: Installing JupyterLab and dependencies...${NC}"
pip install --upgrade pip
pip install "jupyterlab>=4.0.0,<5.0.0" "jupyter_server>=2.0.0,<3.0.0" "jupyter-client>=8.0.0"
pip install aiohttp "requests>=2.25.0"
echo -e "${GREEN}✓ JupyterLab and dependencies installed${NC}"

# Install jupyterlab-ai-assistant from Test PyPI
echo -e "\n${YELLOW}Step 4: Installing jupyterlab-ai-assistant from Test PyPI...${NC}"
pip install ./dist/*.whl 
#pip install -i https://test.pypi.org/simple/ jupyterlab_ai_assistant==0.1.4
echo -e "${GREEN}✓ Extension installed from Test PyPI${NC}"

# Verify installation
echo -e "\n${YELLOW}Step 5: Verifying installation...${NC}"
jupyter labextension list | grep jupyterlab-ai-assistant
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Extension successfully installed from Test PyPI!${NC}"
else
    echo -e "${RED}× Extension installation verification failed${NC}"
    exit 1
fi

echo -e "\n${BLUE}====================================================================${NC}"
echo -e "${GREEN}Installation from Test PyPI completed successfully!${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo 
echo -e "To start JupyterLab with the AI Assistant:"
echo -e "1. Activate the virtual environment: ${YELLOW}source cheak-venv/bin/activate${NC}"
echo -e "2. Start JupyterLab: ${YELLOW}jupyter lab${NC}"

# Ask if user wants to start JupyterLab in debug mode
echo
echo -e "Would you like to start JupyterLab in debug mode to verify the extension? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "\n${YELLOW}Starting JupyterLab in debug mode...${NC}"
    export JUPYTERLAB_LOGLEVEL=DEBUG
    jupyter lab --debug
fi 