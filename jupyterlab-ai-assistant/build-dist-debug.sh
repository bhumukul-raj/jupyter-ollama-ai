#!/bin/bash

# Enable tracing to see each command as it's executed
set -x

# Exit on error
set -e

echo "========== STARTING DEBUG BUILD =========="
echo "Current directory: $(pwd)"
echo "Python executable: $(which python)"

# Create and activate virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
else
    echo "Virtual environment already exists."
fi

echo "Activating virtual environment..."
source venv/bin/activate
echo "Python path: $(which python)"
echo "Python version: $(python --version)"

# Debug: Show where JupyterLab is looking for extensions
PYTHON_SITE_PACKAGES=$(python -c "import site; print(site.getsitepackages()[0])")
echo "Python site packages: $PYTHON_SITE_PACKAGES"
JUPYTER_DATA_DIR=$(python -c "from jupyter_core.paths import jupyter_data_dir; print(jupyter_data_dir())")
echo "Jupyter data dir: $JUPYTER_DATA_DIR"

# Clean previous environment
echo "Cleaning previous installation..."
pip uninstall -y jupyterlab jupyterlab_pygments jupyter_server jupyter_server_terminals

# Completely uninstall the extension
echo "Completely uninstalling the extension..."
pip uninstall jupyterlab-ai-assistant -y
jupyter labextension uninstall jupyterlab-ai-assistant 2>/dev/null || true

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist/
rm -rf build/
rm -rf *.egg-info
rm -rf lib/
rm -rf jupyterlab_ai_assistant/labextension
rm -rf node_modules/

# Clean jupyter directories
echo "Cleaning jupyter extension directories..."
rm -rf ~/.local/share/jupyter/labextensions/jupyterlab_ai_assistant
rm -rf ~/.local/share/jupyter/labextensions/jupyterlab-ai-assistant
rm -rf ~/.local/share/jupyter/lab/schemas/jupyterlab_ai_assistant
rm -rf ~/.local/share/jupyter/lab/schemas/jupyterlab-ai-assistant
rm -rf $(dirname $(which python))/share/jupyter/labextensions/jupyterlab_ai_assistant
rm -rf $(dirname $(which python))/share/jupyter/labextensions/jupyterlab-ai-assistant
rm -rf $(dirname $(which python))/share/jupyter/lab/schemas/jupyterlab_ai_assistant
rm -rf $(dirname $(which python))/share/jupyter/lab/schemas/jupyterlab-ai-assistant

# Install dependencies with specific versions
echo "Installing dependencies with specific versions..."
pip install --upgrade pip setuptools wheel

# Install JupyterLab and core dependencies
echo "Installing JupyterLab and core dependencies..."
pip install "jupyterlab==3.6.3" \
    "jupyter_server<2,>=1.6" \
    "jupyter_server_terminals" \
    "jupyterlab_pygments>=0.3.0" \
    "jupyter-core>=5.3.0" \
    "jupyter-client>=8.3.0" \
    "notebook<7" \
    "nbclassic>=1.0.0" \
    "nbconvert>=7.8.0" \
    "nbformat>=5.9.0"

# Install build dependencies
echo "Installing build dependencies..."
pip install hatchling \
    hatch-nodejs-version \
    hatch-jupyter-builder \
    jupyter_packaging \
    build \
    pip-tools

# Install runtime dependencies
echo "Installing runtime dependencies..."
pip install aiohttp \
    requests

# Verify installations
echo "Verifying installations..."
pip list | grep -E "jupyterlab|jupyter-server|jupyterlab-pygments|hatch|build|aiohttp|requests"

# Clean npm cache and node_modules
echo "Cleaning npm cache and node_modules..."
npm cache clean --force

# Show npm configuration
echo "NPM configuration:"
npm config list

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

# Check package.json
echo "Checking package.json configuration..."
cat package.json | grep -E "name|version|jupyterlab|main|style|types"

# Debug webpack config if it exists
if [ -f "webpack.config.js" ]; then
    echo "Contents of webpack.config.js:"
    cat webpack.config.js
fi

# Check schema directory
echo "Checking schema directory before build:"
find schema -type f | sort

# Build TypeScript code and extension
echo "Building the extension..."
npm run build:prod

# Check if remoteEntry files were generated
echo "Checking for remoteEntry files after build:"
find . -name "remoteEntry*.js" | sort

# Check static directory contents
echo "Static directory contents after build:"
find jupyterlab_ai_assistant/labextension/static -type f 2>/dev/null | sort || echo "Static directory not found"

# Check schema directory contents after build
echo "Schema directory contents after build:"
find schema -type f | sort

# Debug generated lib files
echo "Generated lib files:"
find lib -type f | sort || echo "No lib directory found"

# Build wheel
echo "Building wheel..."
python -m build

# Debug wheel contents
echo "Wheel contents:"
find dist -name "*.whl" -exec unzip -l {} \; | grep -E "labextension|static|remoteEntry|plugin.json"

# Install the wheel for inspection
echo "Installing wheel for inspection..."
pip uninstall jupyterlab-ai-assistant -y
pip install dist/*.whl

# Check where files got installed
echo "Checking installed files:"
pip show -f jupyterlab_ai_assistant | grep -E "labextension|static|remoteEntry|plugin.json"

# Verify schema location
echo "Checking for schema files in Jupyter directories:"
find ~/.local/share/jupyter/lab/schemas -name "plugin.json" | sort
find ~/.local/share/jupyter/lab/schemas -path "*jupyterlab*" | sort
find $PYTHON_SITE_PACKAGES/share/jupyter/lab/schemas -path "*jupyterlab*" 2>/dev/null | sort || echo "No schemas in site-packages"
find $(dirname $(which python))/share/jupyter/lab/schemas -path "*jupyterlab*" 2>/dev/null | sort || echo "No schemas in python bin dir"

# Verify static files
echo "Checking for static files in Jupyter directories:"
find ~/.local/share/jupyter/labextensions -name "remoteEntry*.js" | sort
find $PYTHON_SITE_PACKAGES/share/jupyter/labextensions -name "remoteEntry*.js" 2>/dev/null | sort || echo "No remoteEntry in site-packages"

# Run jupyter extension list with debug
echo "Jupyter extension list:"
jupyter labextension list --debug

# Create symbolic links if files are missing
echo "Creating symbolic links as a potential fix..."

# Check for the source files
SCHEMA_SOURCE="schema/plugin.json"
if [ -f "$SCHEMA_SOURCE" ]; then
    # Create schema directories with both underscore and hyphen
    mkdir -p ~/.local/share/jupyter/lab/schemas/jupyterlab-ai-assistant
    mkdir -p $(dirname $(which python))/share/jupyter/lab/schemas/jupyterlab-ai-assistant
    
    # Copy schema files to both locations
    cp -v $SCHEMA_SOURCE ~/.local/share/jupyter/lab/schemas/jupyterlab-ai-assistant/
    cp -v $SCHEMA_SOURCE $(dirname $(which python))/share/jupyter/lab/schemas/jupyterlab-ai-assistant/
    echo "Schema files copied to hyphenated directories"
else
    echo "Warning: Schema source file not found: $SCHEMA_SOURCE"
fi

# Check for remoteEntry source files
REMOTE_ENTRY_SOURCES=$(find jupyterlab_ai_assistant/labextension/static -name "remoteEntry*.js" 2>/dev/null)
if [ -n "$REMOTE_ENTRY_SOURCES" ]; then
    for src in $REMOTE_ENTRY_SOURCES; do
        filename=$(basename $src)
        # Make hyphenated target directory
        mkdir -p ~/.local/share/jupyter/labextensions/jupyterlab-ai-assistant/static
        mkdir -p $(dirname $(which python))/share/jupyter/labextensions/jupyterlab-ai-assistant/static
        
        # Copy file to hyphenated directories
        cp -v $src ~/.local/share/jupyter/labextensions/jupyterlab-ai-assistant/static/
        cp -v $src $(dirname $(which python))/share/jupyter/labextensions/jupyterlab-ai-assistant/static/
    done
    echo "RemoteEntry files copied to hyphenated directories"
else
    echo "Warning: No remoteEntry source files found in labextension/static"
fi

# Manually check the exact paths where JupyterLab is looking for these files
EXACT_REMOTE_ENTRY_PATH="/lab/extensions/jupyterlab-ai-assistant/static/remoteEntry.e8c2e5248f8ecc93784f.js"
EXACT_SCHEMA_PATH="/home/bhumukul-raj/Desktop/ollama-ai-assistant-project/venv/share/jupyter/lab/schemas/jupyterlab-ai-assistant/plugin.json"

echo "Checking exact error paths from JupyterLab logs:"
# Extract the base directory from the schema path
SCHEMA_BASE_DIR=$(dirname "$EXACT_SCHEMA_PATH")
echo "Schema base dir: $SCHEMA_BASE_DIR"
mkdir -p "$SCHEMA_BASE_DIR"

# Check if we have schema files to copy
if [ -f "$SCHEMA_SOURCE" ]; then
    cp -v "$SCHEMA_SOURCE" "$SCHEMA_BASE_DIR/"
    echo "Schema file copied to exact error path"
else
    echo "Warning: Cannot copy schema, source not found"
fi

# Extract the remote entry path components
REMOTE_ENTRY_NAME=$(basename "$EXACT_REMOTE_ENTRY_PATH")
TARGET_STATIC_DIR="/home/bhumukul-raj/Desktop/ollama-ai-assistant-project/venv/share/jupyter/labextensions/jupyterlab-ai-assistant/static"
mkdir -p "$TARGET_STATIC_DIR"

# Find any remoteEntry file to copy
REMOTE_ENTRY_FILE=$(find . -name "remoteEntry*.js" -type f | head -1)
if [ -n "$REMOTE_ENTRY_FILE" ]; then
    # Create both the hash-specific file and the non-hashed version
    cp -v "$REMOTE_ENTRY_FILE" "$TARGET_STATIC_DIR/$REMOTE_ENTRY_NAME"
    cp -v "$REMOTE_ENTRY_FILE" "$TARGET_STATIC_DIR/remoteEntry.js"
    echo "Remote entry file copied to exact error path"
else
    # Create an empty placeholder
    echo "// Placeholder file" > "$TARGET_STATIC_DIR/$REMOTE_ENTRY_NAME"
    echo "// Placeholder file" > "$TARGET_STATIC_DIR/remoteEntry.js"
    echo "Warning: Created empty remoteEntry placeholders, source not found"
fi

echo "Running jupyter lab to check for errors..."
jupyter lab --log-level=DEBUG > jupyter_debug.log 2>&1 &
JUPYTER_PID=$!
echo "JupyterLab started with PID: $JUPYTER_PID"
echo "Waiting 5 seconds for JupyterLab to start..."
sleep 5

# Capture any errors
echo "Checking for 404 errors in log:"
grep -E "404|Schema not found" jupyter_debug.log || echo "No 404 errors found"

# Kill JupyterLab
kill $JUPYTER_PID
sleep 2
echo "JupyterLab process terminated"

echo "========== DEBUG BUILD COMPLETE =========="
echo "Debug log saved to jupyter_debug.log"
echo "To use the extension:"
echo "1. Activate the virtual environment: source venv/bin/activate"
echo "2. Uninstall any existing version: pip uninstall jupyterlab-ai-assistant -y"
echo "3. Install the new wheel: pip install dist/*.whl"
echo "4. Start JupyterLab: jupyter lab" 