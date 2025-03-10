#!/bin/bash

# Exit on error
set -e

# Check if version argument is provided
if [ $# -ne 1 ]; then
    echo "Usage: $0 <new_version>"
    echo "Example: $0 1.1.0"
    exit 1
fi

NEW_VERSION=$1
CURRENT_VERSION="1.0.1"  # Default current version to check against

# Extract current version from package.json to ensure we're replacing the correct version
if [ -f "package.json" ]; then
    DETECTED_VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)
    if [ -n "$DETECTED_VERSION" ]; then
        CURRENT_VERSION=$DETECTED_VERSION
        echo "Detected current version: $CURRENT_VERSION"
    fi
fi

echo "===== Scanning project for files containing version $CURRENT_VERSION ====="

# Find all files containing the current version, excluding .md files, node_modules, and other unwanted directories
echo "Finding files containing version $CURRENT_VERSION..."
VERSION_FILES=$(grep -r --include="*.*" --exclude="*.md" --exclude-dir={node_modules,.git,dist,build,__pycache__,venv} -l "$CURRENT_VERSION" .)

# Count the number of files found
FILE_COUNT=$(echo "$VERSION_FILES" | grep -v "^$" | wc -l)

echo "Found $FILE_COUNT files containing version string $CURRENT_VERSION:"
echo "$VERSION_FILES" | sed 's/.\///' | sort

# Create an array of known important files to ensure they're always updated
IMPORTANT_FILES=(
    "package.json"
    "ollama_jupyter_ai/labextension/package.json"
    "pyproject.toml"
    "setup.py"
    "ollama_jupyter_ai/__init__.py"
)

echo "===== Updating version from $CURRENT_VERSION to $NEW_VERSION ====="

# Function to update version in a file
update_version_in_file() {
    local file=$1
    
    if [ -f "$file" ]; then
        # Use different sed syntax based on OS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/$CURRENT_VERSION/$NEW_VERSION/g" "$file"
        else
            # Linux
            sed -i "s/$CURRENT_VERSION/$NEW_VERSION/g" "$file"
        fi
        echo "✓ Updated $file"
    else
        echo "⚠️ File not found: $file"
    fi
}

# Process all found files
for file in $VERSION_FILES; do
    # Remove leading './' from file path if present
    file=$(echo "$file" | sed 's/.\///')
    update_version_in_file "$file"
done

# Make sure important files are updated even if they weren't found by grep
for file in "${IMPORTANT_FILES[@]}"; do
    # Skip if already processed
    if ! echo "$VERSION_FILES" | grep -q "$file"; then
        echo "Checking important file: $file"
        update_version_in_file "$file"
    fi
done

echo "===== Verification ====="
echo "Checking versions in key files:"

# Function to check version in file
check_version_in_file() {
    local file=$1
    local pattern=$2
    
    if [ -f "$file" ]; then
        local version=$(grep -o "$pattern" "$file" | head -1)
        echo "  - $file: $version"
    else
        echo "  - $file: Not found"
    fi
}

check_version_in_file "package.json" "\"version\": \"[^\"]*\""
check_version_in_file "ollama_jupyter_ai/labextension/package.json" "\"version\": \"[^\"]*\""
check_version_in_file "pyproject.toml" "version = \"[^\"]*\""
check_version_in_file "setup.py" "version = \"[^\"]*\""
check_version_in_file "ollama_jupyter_ai/__init__.py" "__version__ = \"[^\"]*\""

echo ""
echo "===== Version update complete ====="
echo "Version has been updated from $CURRENT_VERSION to $NEW_VERSION"
echo ""
echo "Next steps:"
echo "1. Commit the changes: git commit -am \"Bump version to $NEW_VERSION\""
echo "2. Create a git tag: git tag v$NEW_VERSION"
echo "3. Push changes: git push && git push --tags"
echo "4. Build the package: python -m build"
echo "5. Upload to PyPI: python -m twine upload dist/*" 